'use client'

import React, { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react';

interface ChatMessage {
  query: string;
  answer: string;
  relevantLinks: { title: string; link: string }[];
}

const Page = () => {
  const [query, setQuery] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentChatIndex, setCurrentChatIndex] = useState(0)
  const [allChats, setAllChats] = useState<ChatMessage[][]>([[]])

  useEffect(() => {
    const savedAllChats = localStorage.getItem('allChats')
    if (savedAllChats) {
      const parsedChats = JSON.parse(savedAllChats)
      setAllChats(parsedChats)
      setCurrentChatIndex(parsedChats.length - 1)
      setChatHistory(parsedChats[parsedChats.length - 1])
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      const data = await response.json()
      const newChatMessage: ChatMessage = {
        query,
        answer: data.answer,
        relevantLinks: data.relevantLinks
      }
      const updatedChatHistory = [...chatHistory, newChatMessage]
      setChatHistory(updatedChatHistory)
      const updatedAllChats = [...allChats]
      updatedAllChats[currentChatIndex] = updatedChatHistory
      setAllChats(updatedAllChats)
      localStorage.setItem('allChats', JSON.stringify(updatedAllChats))
      setQuery('')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startNewChat = () => {
    const newAllChats = [...allChats, []]
    setAllChats(newAllChats)
    setCurrentChatIndex(newAllChats.length - 1)
    setChatHistory([])
    localStorage.setItem('allChats', JSON.stringify(newAllChats))
  }

  const switchChat = (index: number) => {
    setCurrentChatIndex(index)
    setChatHistory(allChats[index])
  }

  const deleteChat = (index: number) => {
    const updatedAllChats = allChats.filter((_, i) => i !== index)
    setAllChats(updatedAllChats)
    localStorage.setItem('allChats', JSON.stringify(updatedAllChats))
    if (index === currentChatIndex) {
      const newIndex = index > 0 ? index - 1 : 0
      setCurrentChatIndex(newIndex)
      setChatHistory(updatedAllChats[newIndex] || [])
    } else if (index < currentChatIndex) {
      setCurrentChatIndex(currentChatIndex - 1)
    }
  }

  const extractLinksFromAnswer = (answer: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return answer.match(urlRegex) || [];
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
        <button
          onClick={startNewChat}
          className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + New Chat
        </button>
        {allChats.map((chat, index) => (
          <div
            key={index}
            className={`flex items-center justify-between cursor-pointer p-2 mb-2 rounded ${
              index === currentChatIndex ? 'bg-blue-200' : 'hover:bg-gray-200'
            }`}
            onClick={() => switchChat(index)}
          >
            <div>Chat {index + 1}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteChat(index)
              }}
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">AI-Powered Search</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query"
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {chatHistory.map((chat, index) => (
          <div key={index} className="mb-6 border-b pb-4">
            <h2 className="text-xl font-semibold mb-2">Query:</h2>
            <p className="mb-4">{chat.query}</p>
            <h2 className="text-xl font-semibold mb-2">Answer:</h2>
            <p className="mb-4">{chat.answer}</p>
            <h2 className="text-xl font-semibold mb-2">Relevant Links:</h2>
            <ul className="list-disc pl-5">
              {chat.relevantLinks.map((link, linkIndex) => (
                <li key={linkIndex}>
                  <a href={link.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {link.title}
                  </a>
                </li>
              ))}
              {extractLinksFromAnswer(chat.answer).map((link, linkIndex) => (
                <li key={`answer-link-${linkIndex}`}>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Page