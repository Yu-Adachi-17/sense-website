// src/components/HomeIcon.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomeIcon = ({ size = '40px' }) => {
  const navigate = useNavigate();

  return (
    <img
      src="/homeIcon.jpeg" // public フォルダ直下に homeIcon.jpeg がある場合
      alt="Home Icon"
      style={{
        width: size,
        height: 'auto',
        cursor: 'pointer',
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 1000
      }}
      onClick={() => {
        // 外部サイトへ遷移（必要に応じて変更）
        window.location.href = 'https://sense-ai.world';
      }}
    />
  );
};

export default HomeIcon;
