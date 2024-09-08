import { NextResponse } from 'next/server';
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import axios from 'axios';
import * as cheerio from 'cheerio';
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
  const response = await axios.get(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
  const $ = cheerio.load(response.data);
  const results: SearchResult[] = [];
  $('div.g').each((i, element) => {
    const titleElement = $(element).find('h3');
    const title = titleElement.text();
    const link = titleElement.parent('a').attr('href') || '';
    const snippet = $(element).find('div.VwiC3b').text();
    if (title && link && snippet) {
      results.push({ title, link, snippet });
    }
  });
  return results.slice(0, 5);
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

    const relevantLinks = result.map(doc => ({
      title: doc.metadata.source,
      link: doc.metadata.source
    }));

    // Add the AI's response to chat history
    chatHistory.push(response.content);

    // Update vector store with new information
    await updateVectorStore(query, response.content);

    return NextResponse.json({
      answer: response.content,
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