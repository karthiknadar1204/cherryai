import { NextResponse } from 'next/server';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import axios from 'axios';
import { Document } from "langchain/document";

const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.8,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const googleSearch = async (query: string): Promise<SearchResult[]> => {
  const data = JSON.stringify({
    q: query,
    location: "Mumbai, Maharashtra, India",
    gl: "in"
  });

  const config = {
    method: 'post',
    url: 'https://google.serper.dev/search',
    headers: { 
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data: data
  };

  try {
    const response = await axios(config);
    const searchResults = response.data.organic || [];

    return searchResults.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
    })).slice(0, 5);
  } catch (error) {
    console.error('Error fetching search results:', error);
    return [];
  }
};

let vectorStore: MemoryVectorStore | null = null;
let chatHistory: string[] = [];

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!vectorStore) {
      vectorStore = await initializeVectorStore();
    }

    chatHistory.push(query);

    const retriever = vectorStore.asRetriever({
      k: 3,
    });
    const result = await retriever.invoke(chatHistory.join(" "));
    const resultDocuments = result.map((doc) => doc.pageContent);

    const googleResults = await googleSearch(query);
    const googleLinks = googleResults.map((res) => ({
      title: res.title,
      link: res.link,
      snippet: res.snippet,
    }));

    const combinedSnippets = googleResults.map(res => res.snippet).join(" ");

    const template = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are an AI assistant with access to a knowledge base. Answer the user's question based on the following context: {context}. Provide a detailed answer of up to 300 words. Consider the chat history for context. After your answer, provide a list of up to 5 relevant web links.",
      ],
      ["human", "{query}"],
    ]);

    const chain = template.pipe(model);

    const response = await chain.invoke({
      query: query,
      context: resultDocuments,
    });

    const finalResponse = `${response.content}\n\nAdditional context from web links: ${combinedSnippets}`;

    const relevantLinks = googleLinks.concat(result.map(doc => ({
      title: doc.metadata.source,
      link: doc.metadata.source
    })));

    chatHistory.push(finalResponse);

    await updateVectorStore(query, finalResponse);

    return NextResponse.json({
      answer: finalResponse,
      relevantLinks: relevantLinks
    });

  } catch (error) {
    console.error('An error occurred:', error);
    return NextResponse.json({ error: 'An error occurred while processing your request' }, { status: 500 });
  }
}

async function initializeVectorStore(): Promise<MemoryVectorStore> {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  return new MemoryVectorStore(embeddings);
}

async function updateVectorStore(query: string, response: string) {
  if (!vectorStore) return;

  const newDoc = new Document({
    pageContent: `Query: ${query}\nResponse: ${response}`,
    metadata: { source: 'chat history' }
  });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 150,
    chunkOverlap: 10,
  });
  const splittedDocs = await splitter.splitDocuments([newDoc]);

  await vectorStore.addDocuments(splittedDocs);
}
