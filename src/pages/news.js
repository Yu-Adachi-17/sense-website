import React, { useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import HomeIcon from './homeIcon';

export async function getServerSideProps(context) {
  const { query } = context;
  const currentPage = query.page ? parseInt(query.page, 10) : 1;
  const itemsPerPage = 20;

  try {
    const response = await axios.get(
      `https://ai-news-production-a7b7.up.railway.app/api/news?page=${currentPage}&limit=${itemsPerPage}`
    );

    return {
      props: {
        articles: response.data.articles || [],
        totalPages: response.data.totalPages || 1,
        currentPage,
      },
    };
  } catch (error) {
    console.error("ニュース取得エラー:", error);
    return {
      props: {
        articles: [],
        totalPages: 1,
        currentPage,
      },
    };
  }
}

const News = ({ articles, totalPages, currentPage }) => {
    const [selectedArticle, setSelectedArticle] = useState(null);
    
    const openArticle = (article) => setSelectedArticle(article);
    const closeOverlay = () => setSelectedArticle(null);
  
    const homeIconStyle = {
      position: 'absolute',
      top: '20px',
      left: '20px',
      cursor: 'pointer',
    };
  
    const formatSummary = (text) => {
      if (!text) return null;
      return text.split('\n').map((line, index) => {
        const trimmedLine = line.trim();
        if (
          trimmedLine === 'Points:' ||
          trimmedLine === 'Lecture:' ||
          trimmedLine === 'Our Forecast:'
        ) {
          const label = trimmedLine.slice(0, -1);
          return (
            <div key={index} className="heading">
              <span style={{ fontFamily: "Impact, sans-serif", fontWeight: "bold", fontSize: "1.2em" }}>
                {label}<span style={{ color: 'transparent' }}>:</span>
              </span>
            </div>
          );
        }
        return <div key={index}>{line}</div>;
      });
    };
  
    const formatSummaryForList = (text, date) => {
      if (!text) return null;
      const lectureIndex = text.indexOf('Lecture:');
      let pointsText = lectureIndex !== -1 ? text.substring(0, lectureIndex) : text;
      if (pointsText.length > 400) pointsText = pointsText.substring(0, 400) + '...';
      
      let formattedDate = "";
      if (date) {
        formattedDate = new Date(date).toLocaleDateString("en-US", {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
      
      return (
        <div style={{ position: "relative", paddingBottom: "2rem" }}>
          {pointsText.split('\n').map((line, index) => <div key={index}>{line}</div>)}
          <div style={{ position: "absolute", right: "10px", fontFamily: "Impact, sans-serif", fontSize: "1rem" }}>
            {formattedDate}
          </div>
        </div>
      );
    };
  
    return (
      <div className="news-page">
        <Head>
          <title>One Minute AI News</title>
          <meta name="description" content="最新のAI関連ニュースを毎日更新。" />
          <meta name="robots" content="index, follow" />
        </Head>
  
        <div style={homeIconStyle}>
          <HomeIcon size={30} />
        </div>
        <h1 className="news-header">
          One Minute <span className="gradient-text">AI</span> News
        </h1>
  
        <div className="news-grid">
          {articles.map(article => (
            <div key={article.link} className="news-card" onClick={() => openArticle(article)}>
              <h2 className="news-title">{article.title}</h2>
              {article.imageUrl && (
                <img src={article.imageUrl} alt="Article" className="news-image" />
              )}
              <div className="news-summary">{formatSummaryForList(article.summary, article.date)}</div>
            </div>
          ))}
        </div>
  
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => (
              <a
                key={i + 1}
                href={`/news?page=${i + 1}`}
                className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
              >
                {i + 1}
              </a>
            ))}
          </div>
        )}
  
        {selectedArticle && (
          <div className="overlay" onClick={closeOverlay}>
            <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
              <button className="overlay-close" onClick={closeOverlay}>×</button>
              <h2 className="overlay-title">{selectedArticle.title}</h2>
              <div className="overlay-summary">{formatSummary(selectedArticle.summary)}</div>
              <a className="overlay-link" href={selectedArticle.link} target="_blank" rel="noopener noreferrer">
                Read Full Article
              </a>
            </div>
            <div className="overlay-extra">
              この話題、<a href="https://www.sense-ai.world/" target="_blank" rel="noopener noreferrer">議事録AI</a>で議論してみませんか？
            </div>
          </div>
        )}
      </div>
    );
  };
  export default News;