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

  // 改行と中見出しのスタイル変換用の関数（詳細表示用）
  const formatSummary = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (
        trimmedLine === 'Points:' ||
        trimmedLine === 'Lecture:' ||
        trimmedLine === 'Original Forecast:'
      ) {
        // コロンを除いたテキストと、透明なコロンを分けてレンダリング
        const label = trimmedLine.slice(0, -1);
        return (
          <div key={index} className="heading">
            <span style={{
              fontFamily: "Impact, sans-serif",
              fontWeight: "bold",
              fontSize: "1.2em"
            }}>
              {label}<span style={{ color: 'transparent' }}>:</span>
            </span>
          </div>
        );
      }
      // 通常の行はそのまま返す
      return (
        <div key={index}>
          {line}
        </div>
      );
    });
  };

  // 一覧表示用のサマリー整形関数
  const formatSummaryForList = (text) => {
    if (!text) return null;
    
    // 「Lecture:」の位置を探し、そこまでのテキスト（＝Pointsのみ）を抽出
    const lectureIndex = text.indexOf('Lecture:');
    let pointsText;
    if (lectureIndex !== -1) {
      pointsText = text.substring(0, lectureIndex);
    } else {
      pointsText = text;
    }
    
    // 400文字を超える場合はカットして「...」を追加
    if (pointsText.length > 400) {
      pointsText = pointsText.substring(0, 400) + '...';
    }
    
    // 改行ごとに<div>でラップして返す
    return pointsText.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (
        trimmedLine === 'Points:' ||
        trimmedLine === 'Lecture:' ||
        trimmedLine === 'Original Forecast:'
      ) {
        const label = trimmedLine.slice(0, -1);
        return (
          <div key={index} className="heading">
            <span style={{
              fontFamily: "Impact, sans-serif",
              fontWeight: "bold",
              fontSize: "1.2em"
            }}>
              {label}<span style={{ color: 'transparent' }}>:</span>
            </span>
          </div>
        );
      }
      return (
        <div key={index}>{line}</div>
      );
    });
  };

  return (
    <div className="news-page">
      <h1 className="news-header">
        One Minute <span className="gradient-text">AI</span> News
      </h1>

      <div className="news-grid">
        {currentArticles.map(article => (
          <div key={article.link} className="news-card" onClick={() => openArticle(article)}>
            <h2 className="news-title">{article.title}</h2>
            {article.imageUrl && (
              <img src={article.imageUrl} alt="Article" className="news-image" />
            )}
            <div className="news-summary">
              {formatSummaryForList(article.summary)}
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
