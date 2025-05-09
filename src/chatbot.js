import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './chatbot.css';

const Chatbot = () => {
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    preferredLanguages: [],
    previousTools: [],
    projectRequirements: {},
    lastProjectType: ''
  });

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

  useEffect(() => {
    const savedPreferences = localStorage.getItem('techStackPreferences');
    if (savedPreferences) {
      setUserPreferences(JSON.parse(savedPreferences));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('techStackPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  useEffect(() => {
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      console.log('User said:', speechToText);
      setTranscript(speechToText);
      updateChatHistory('user', speechToText);
      handleSend(speechToText);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }, []);

  const startListening = () => {
    setIsListening(true);
    recognition.start();
  };

  const updateChatHistory = (sender, message) => {
    setChatHistory(prev => [...prev, { sender, message }]);
  };

  const extractPreferences = (message) => {
    const newPreferences = { ...userPreferences };

    const languageKeywords = ['JavaScript', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go', 'TypeScript'];
    const mentionedLanguages = languageKeywords.filter(lang =>
      message.toLowerCase().includes(lang.toLowerCase())
    );

    if (mentionedLanguages.length > 0) {
      newPreferences.preferredLanguages = [
        ...new Set([...newPreferences.preferredLanguages, ...mentionedLanguages])
      ];
    }

    const projectTypes = ['social media', 'e-commerce', 'blog', 'dashboard', 'mobile app', 'API'];
    const mentionedProjectType = projectTypes.find(type =>
      message.toLowerCase().includes(type)
    );

    if (mentionedProjectType) {
      newPreferences.lastProjectType = mentionedProjectType;
    }

    const techKeywords = ['React', 'Angular', 'Vue', 'Django', 'Flask', 'Laravel', 'Express', 'Spring'];
    const mentionedTech = techKeywords.filter(tech =>
      message.toLowerCase().includes(tech.toLowerCase())
    );

    if (mentionedTech.length > 0) {
      newPreferences.previousTools = [
        ...new Set([...newPreferences.previousTools, ...mentionedTech])
      ];
    }

    setUserPreferences(newPreferences);
  };

  const generatePrompt = (message) => {
    let prompt = `You are a technology stack recommendation assistant. The user is asking: "${message}"\n\n`;

    if (userPreferences.preferredLanguages.length > 0) {
      prompt += `The user has previously worked with these languages: ${userPreferences.preferredLanguages.join(', ')}. `;
    }

    if (userPreferences.previousTools.length > 0) {
      prompt += `They have experience with these tools/frameworks: ${userPreferences.previousTools.join(', ')}. `;
    }

    if (userPreferences.lastProjectType) {
      prompt += `Their last project was a ${userPreferences.lastProjectType} application. `;
    }

    prompt += `Provide detailed, personalized recommendations with explanations. Mention alternatives and trade-offs. `;
    prompt += `If they're asking about updates or comparisons, check for the latest versions and trends. `;
    prompt += `Keep the response concise, ideally within 6 to 7 lines.`;

    return prompt;
  };

  const handleSend = async (message) => {
    extractPreferences(message);
    const contextPrompt = generatePrompt(message);

    try {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCjgIWmsc59bXWcukmsbainHT0At1EghVE",
        {
          contents: [
            {
              parts: [{ text: contextPrompt }],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': 'your google api key',
          },
        }
      );

      const reply = response.data.candidates[0].content.parts[0].text;
      console.log('Gemini Response:', reply);
      setResponse(reply);
      updateChatHistory('assistant', reply);
      speakResponse(reply);
    } catch (error) {
      console.error('Gemini API Error:', error.response ? error.response.data : error.message);
      const errorMessage = 'Sorry, something went wrong. Please try again.';
      setResponse(errorMessage);
      updateChatHistory('assistant', errorMessage);
    }
  };

  const speakResponse = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    synth.speak(utterance);
  };

  const handleTextSend = (e) => {
    e.preventDefault();
    if (userInput.trim() !== '') {
      setTranscript(userInput);
      updateChatHistory('user', userInput);
      handleSend(userInput);
      setUserInput('');
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setResponse('');
    setTranscript('');
    setUserInput('');
  };

  return (
    <div className="voice-assistant-container">
      <h1>Personalized Tech Stack Advisor</h1>
      <p className="subtitle">I remember your preferences to provide better recommendations</p>

      <div className="input-section">
        <button onClick={startListening} disabled={isListening}>
          {isListening ? 'Listening...' : 'Start Speaking 🎙'}
        </button>

        <form onSubmit={handleTextSend}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ask about frameworks, tools, or compare technologies..."
          />
          <button type="submit">Send 💬</button>
          <button type="button" onClick={clearChat} className="clear-btn">
            Clear Chat
          </button>
        </form>
      </div>

      <div className="preferences-summary">
        <h3>Your Preferences:</h3>
        {userPreferences.preferredLanguages.length > 0 && (
          <p><strong>Languages:</strong> {userPreferences.preferredLanguages.join(', ')}</p>
        )}
        {userPreferences.previousTools.length > 0 && (
          <p><strong>Experience with:</strong> {userPreferences.previousTools.join(', ')}</p>
        )}
        {userPreferences.lastProjectType && (
          <p><strong>Last Project:</strong> {userPreferences.lastProjectType}</p>
        )}
        {userPreferences.preferredLanguages.length === 0 &&
          userPreferences.previousTools.length === 0 &&
          !userPreferences.lastProjectType && (
            <p>No preferences saved yet. Ask me about technologies to get started!</p>
          )}
      </div>

      <div className="chat-history">
        {chatHistory.map((chat, index) => (
          <div key={index} className={`chat-message ${chat.sender}`}>
            <strong>{chat.sender === 'user' ? 'You' : 'Assistant'}:</strong>
            <div className="message-content">{chat.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Chatbot;
