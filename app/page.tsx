'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Menu, X } from 'lucide-react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
    setIsSidebarOpen(false)
  }

  const switchChat = (index: number) => {
    setCurrentChatIndex(index)
    setChatHistory(allChats[index])
    setIsSidebarOpen(false)
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
    <div className="flex flex-col md:flex-row h-screen bg-black text-blue-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-gray-800 rounded"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-900 p-4 overflow-y-auto fixed md:static top-0 left-0 h-full z-10`}>
        <button
          onClick={startNewChat}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-blue-100 rounded hover:bg-blue-700"
        >
          + New Chat
        </button>
        {allChats.map((chat, index) => (
          <div
            key={index}
            className={`flex items-center justify-between cursor-pointer p-2 mb-2 rounded ${
              index === currentChatIndex ? 'bg-blue-900' : 'hover:bg-gray-800'
            }`}
            onClick={() => switchChat(index)}
          >
            <div>Chat {index + 1}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteChat(index)
              }}
              className="text-blue-300 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 p-4 overflow-y-auto bg-black">
        <h1 className="text-2xl font-bold mb-4 text-blue-200 mt-12 md:mt-0">CherryAi</h1>
        <form onSubmit={handleSubmit} className="mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query"
            className="w-full p-2 border border-blue-500 rounded bg-gray-900 text-blue-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full md:w-auto px-4 py-2 bg-blue-600 text-blue-100 rounded hover:bg-blue-700 disabled:bg-gray-700"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {chatHistory.map((chat, index) => (
          <div key={index} className="mb-6 border-b border-blue-900 pb-4">
            <h2 className="text-xl font-semibold mb-2 text-blue-300">Query:</h2>
            <p className="mb-4 text-blue-100 break-words">{chat.query}</p>
            <h2 className="text-xl font-semibold mb-2 text-blue-300">Answer:</h2>
            <p className="mb-4 text-blue-100 break-words">{chat.answer}</p>
            <h2 className="text-xl font-semibold mb-2 text-blue-300">Relevant Links:</h2>
            <ul className="list-disc pl-5">
              {chat.relevantLinks.map((link, linkIndex) => (
                <li key={linkIndex} className="mb-1 break-words">
                  <a href={link.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    {link.title}
                  </a>
                </li>
              ))}
              {extractLinksFromAnswer(chat.answer).map((link, linkIndex) => (
                <li key={`answer-link-${linkIndex}`} className="mb-1 break-words">
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
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