import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './News.css';

const News = () => {
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  useEffect(() => {
    axios.get('https://ai-news-production-a7b7.up.railway.app/api/news')
      .then(response => setArticles(response.data))
      .catch(error => console.error("ニュース取得エラー:", error));
  }, []);

  // ページ番号に応じた記事を抽出
  const totalPages = Math.ceil(articles.length / itemsPerPage);
  const currentArticles = articles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openArticle = (article) => {
    setSelectedArticle(article);
  };

  const closeOverlay = () => {
    setSelectedArticle(null);
  };

  // 改行と中見出しのスタイル変換用の関数
  const formatSummary = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      // 空行はそのまま改行

      // 行全体が特定の見出しラベル（末尾にコロン付き）と一致する場合のみ見出しとする
      const trimmedLine = line.trim();
      if (
        trimmedLine === 'Points:' ||
        trimmedLine === 'Lecture:' ||
        trimmedLine === 'Original Forecast:'
      ) {
        return (
          <div key={index} className="heading">
            {trimmedLine}
          </div>
        );
      }
      // 通常の行
      return (
        <div key={index}>
          {line}
        </div>
      );
    });
  };
  

  return (
    <div className="news-page">
      <h1 className="news-header">
        One Minutes <span className="gradient-text">AI</span> News
      </h1>

      <div className="news-grid">
        {currentArticles.map(article => (
          <div key={article.link} className="news-card" onClick={() => openArticle(article)}>
            <h2 className="news-title">{article.title}</h2>
            {article.imageUrl && (
              <img src={article.imageUrl} alt="Article" className="news-image" />
            )}
            <div className="news-summary">
              {formatSummary(article.summary)}
            </div>
          </div>
        ))}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {selectedArticle && (
        <div className="overlay" onClick={closeOverlay}>
          <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
            <button className="overlay-close" onClick={closeOverlay}>×</button>
            <h2 className="overlay-title">{selectedArticle.title}</h2>
            <div className="overlay-summary">
              {formatSummary(selectedArticle.summary)}
            </div>
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
