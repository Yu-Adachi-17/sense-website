// News.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './News.css';

// 文字列を整形する関数
function formatSummary(text) {
  // 中見出し（■Point, ■Lecture, ■Original Forecast）の前に改行タグとspanタグを追加（改行は1つ）
  let formatted = text.replace(
    /(■(?:Point|Lecture|Original Forecast))/g,
    '<br/><span class="subheading">$1</span>'
  );
  // 箇条書き部分（例：・で始まる行）の後に改行タグを挿入
  formatted = formatted.replace(/(・.+)(\n|$)/g, '$1<br/>');
  // 連続する改行タグがあれば1つにまとめる
  formatted = formatted.replace(/(<br\/>\s*)+/g, '<br/>');
  return formatted;
}

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
            <p className="news-summary">{article.summary}</p>
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
            {/* 文字列を整形したHTMLを描画 */}
            <p 
              className="overlay-summary" 
              dangerouslySetInnerHTML={{ __html: formatSummary(selectedArticle.summary) }}
            ></p>
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
