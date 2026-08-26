import { useState, useEffect } from 'react';

const GREETINGS = [
  "Hello",
  "नमस्ते",
  "नमस्कारः",
  "こんにちは",
  "Hallo",
  "Привет",
  "Hola",
  "Bonjour",
  "Ciao",
  "안녕하세요"
];

import FluidBackground from './FluidBackground';

function App() {
  const [greeting, setGreeting] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout;
    const currentWord = GREETINGS[index];
    
    if (isDeleting) {
      if (greeting === '') {
        setIsDeleting(false);
        setIndex((prev) => (prev + 1) % GREETINGS.length);
      } else {
        timeout = setTimeout(() => {
          setGreeting(currentWord.substring(0, greeting.length - 1));
        }, 80);
      }
    } else {
      if (greeting === currentWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      } else {
        timeout = setTimeout(() => {
          setGreeting(currentWord.substring(0, greeting.length + 1));
        }, 125);
      }
    }
    
    return () => clearTimeout(timeout);
  }, [greeting, isDeleting, index]);

  return (
    <>
      <FluidBackground />
      <div className="portfolio-container">
        <div className="portfolio-content">
          <h2 className="greeting">{greeting} , I'm</h2>
          <h1 className="name">Kyush Kumar</h1>
        </div>
      </div>
    </>
  )
}

export default App
