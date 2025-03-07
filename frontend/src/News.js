// News.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './News.css';

const News = () => {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    axios.get('https://ai-news-production-a7b7.up.railway.app/api/news')
      .then(response => setArticles(response.data))
      .catch(error => console.error("ニュース取得エラー:", error));
  }, []);

  const openArticle = (article) => {
    setSelectedArticle(article);
  };

  const closeOverlay = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="news-page">
      <h1 className="news-header">One Minutes News</h1>
      <div className="news-grid">
        {articles.map(article => (
          <div key={article.link} className="news-card" onClick={() => openArticle(article)}>
            <h2 className="news-title">{article.title}</h2>
            {/* 画像をタイトルの下に表示。floatで回り込みさせる */}
            <img src="/example.jpg" alt="Example" className="news-image" />
            <p className="news-summary">{article.summary}</p>
          </div>
        ))}
      </div>

      {selectedArticle && (
        <div className="overlay" onClick={closeOverlay}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <button className="overlay-close" onClick={closeOverlay}>×</button>
            <h2 className="overlay-title">{selectedArticle.title}</h2>
            <p className="overlay-summary">{selectedArticle.summary}</p>
            <a className="overlay-link" href={selectedArticle.link} target="_blank" rel="noopener noreferrer">
              Read Full Article
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
