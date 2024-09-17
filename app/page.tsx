'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Menu, X, Send, PlusCircle } from 'lucide-react';

interface ChatMessage {
  query: string;
  answer: string;
  relevantLinks: { title: string; link: string; snippet: string }[];
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
    if (!query.trim()) return
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
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-gray-900 to-black text-blue-100">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-blue-600 rounded-full shadow-lg"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <div className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-72 bg-gray-900 bg-opacity-80 backdrop-blur-lg p-6 overflow-y-auto fixed md:static top-0 left-0 h-full z-10 transition-all duration-300 ease-in-out`}>
        <h2 className="text-2xl font-bold mb-6 text-blue-300">CherryAI</h2>
        <button
          onClick={startNewChat}
          className="w-full mb-6 px-4 py-2 bg-blue-600 text-blue-100 rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center"
        >
          <PlusCircle size={20} className="mr-2" />
          New Chat
        </button>
        {allChats.map((chat, index) => (
          <div
            key={index}
            className={`flex items-center justify-between cursor-pointer p-3 mb-2 rounded-lg transition duration-300 ${
              index === currentChatIndex ? 'bg-blue-800 bg-opacity-50' : 'hover:bg-gray-800 hover:bg-opacity-50'
            }`}
            onClick={() => switchChat(index)}
          >
            <div className="truncate">Chat {index + 1}</div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteChat(index)
              }}
              className="text-blue-300 hover:text-red-400 transition duration-300"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-y-auto bg-opacity-75 backdrop-blur-sm">
        <h1 className="text-4xl font-bold mb-8 text-blue-200 mt-12 md:mt-0 text-center">Welcome to CherryAI</h1>
        <div className="max-w-3xl mx-auto">
          {chatHistory.length === 0 && (
            <div className="text-center text-blue-300 mb-8">
              <p className="text-lg mb-4">Start a new conversation by typing your query below.</p>
              <p>CherryAI is here to assist you with any questions you may have!</p>
            </div>
          )}
          {chatHistory.map((chat, index) => (
            <div key={index} className="mb-8 bg-gray-800 bg-opacity-50 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-3 text-blue-300">Query:</h2>
              <p className="mb-4 text-blue-100 break-words bg-gray-700 bg-opacity-50 p-3 rounded-lg">{chat.query}</p>
              <h2 className="text-xl font-semibold mb-3 text-blue-300">Answer:</h2>
              <p className="mb-4 text-blue-100 break-words bg-gray-700 bg-opacity-50 p-3 rounded-lg">{chat.answer}</p>
              <h2 className="text-xl font-semibold mb-3 text-blue-300">Relevant Links:</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chat.relevantLinks.map((link, linkIndex) => (
                  <div key={linkIndex} className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                    <a href={link.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition duration-300 font-semibold">
                      {link.title}
                    </a>
                    <p className="text-sm text-blue-100 mt-2 line-clamp-3">{link.snippet}</p>
                  </div>
                ))}
                {extractLinksFromAnswer(chat.answer).map((link, linkIndex) => (
                  <div key={`answer-link-${linkIndex}`} className="bg-gray-700 bg-opacity-50 p-4 rounded-lg">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition duration-300 break-words">
                      {link}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="mt-8 max-w-3xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to know?"
              className="w-full p-4 pr-12 border border-blue-500 rounded-full bg-gray-800 bg-opacity-50 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 top-2 p-2 bg-blue-600 text-blue-100 rounded-full hover:bg-blue-700 disabled:bg-gray-700 transition duration-300"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-t-2 border-blue-200 border-solid rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Page