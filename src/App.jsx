import { useState, useEffect, useRef } from 'react';

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
  "> npm start"
];

import FluidBackground from './FluidBackground';
import RopeIntro from './RopeIntro';

function App() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('intro=true')) {
      return true;
    }
    return !sessionStorage.getItem('ropeIntroShown');
  });
  const [greeting, setGreeting] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [aboutVisible, setAboutVisible] = useState(false);
  const aboutRef = useRef(null);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAboutVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    if (aboutRef.current) {
      observer.observe(aboutRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {showIntro && (
        <RopeIntro
          onComplete={() => {
            sessionStorage.setItem('ropeIntroShown', 'true');
            setShowIntro(false);
          }}
        />
      )}
      <FluidBackground />
      <div className="portfolio-container">
        <section className="hero-section">
          <div className="portfolio-content">
            <h2 className="greeting">{greeting} , I'm</h2>
            <h1 className="name">Kyush Kumar</h1>
          </div>
        </section>

        <section 
          ref={aboutRef} 
          className={`about-section ${aboutVisible ? 'is-visible' : ''}`}
        >
          <div className="about-inner">
            <h2 className="about-heading">ABOUT</h2>
            <div className="about-content">
              <p className="about-lead">
                I’m a second-year B.Tech Computer Science student at <strong>Guru Ghasidas Vishwavidyalaya (Central University)</strong>, driven by curiosity and a constant desire to build.
              </p>
              <p className="about-text">
                I enjoy turning ideas into practical software, experimenting with new technologies, and understanding how things work beyond the surface. From developing projects to participating in hackathons, I’m continuously sharpening my skills in <strong>software development, problem-solving, web technologies, and modern development practices</strong>.
              </p>
              <p className="about-text">
                I’m currently focused on growing as a developer, building meaningful projects, and exploring the intersection of <strong>technology, creativity, and real-world problem solving</strong>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default App
