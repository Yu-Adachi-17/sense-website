import HomeIcon from '../components/HomeIcon';
import React from 'react';
import { FaApple } from "react-icons/fa";

import PrivacyPolicy from "../components/PrivacyPolicy";
import TermsOfUse from "../components/TermsOfUse";
import TransactionsLaw from "../components/TransactionsLaw";

const SEOPage = () => {
  const containerStyle = {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '30px',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px',
    lineHeight: 1.8,
    fontFamily: 'Arial, sans-serif',
    textAlign: 'left',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  };

  const homeIconStyle = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    cursor: 'pointer',
  };

  const centerTextStyle = {
    textAlign: 'center',
    fontSize: '48px',
    fontWeight: 'bold',
    marginBottom: '40px',
  };

  const headingStyle = {
    fontWeight: 'bold',
  };

  const h1Style = {
    fontSize: '40px',
    marginBottom: '20px',
    ...headingStyle,
  };

  const h2Style = {
    fontSize: '28px',
    marginTop: '30px',
    marginBottom: '10px',
    ...headingStyle,
  };

  const paragraphStyle = {
    marginBottom: '10px',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thStyle = {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
  };

  const tdStyle = {
    border: '1px solid #777',
    padding: '10px',
    textAlign: 'center',
  };

  const appStoreButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#fff',
    backgroundColor: '#000',
    border: '1px solid #fff',
    padding: '6px 12px',
    borderRadius: '4px',
    textDecoration: 'none',
    marginTop: '10px',
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.25), rgba(255,255,255,0))',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(255,255,255,0.3)',
  };

  const footerLinksContainerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #777',
  };

  const footerLinkStyle = {
    color: '#fff',
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Position HomeIcon at the top left */}
      <div style={homeIconStyle}>
        <HomeIcon size={30} />
      </div>

      <div style={containerStyle}>
        <div style={centerTextStyle}>Minutes AI Service & Pricing</div>
        
        <h1 style={h1Style}>AI Tool That Automatically Creates Meeting Minutes</h1>
        
        <p style={paragraphStyle}>
          Minutes AI leverages cutting-edge artificial intelligence technology to instantly analyze meeting audio and automatically generate highly accurate meeting minutes. With just one tap, it efficiently converts speech to text and shares it via the cloud, significantly reducing post-meeting tasks.
        </p>

        <h2 style={h2Style}>Features</h2>
        
        <h3>State-of-the-Art Speech Recognition AI</h3>
        <p>
          It employs advanced natural language processing to accurately capture conversational nuances. Diverse statements are converted into text with minimal errors, producing highly accurate meeting minutes.
        </p>
        
        <h3>Flexible Meeting Minutes Formats</h3>
        <p>
          Automatically formats minutes according to your needs. It efficiently generates meeting minutes suitable for regular meetings, online conferences, and more.
        </p>
        
        <h3>Multilingual Support</h3>
        <p>
          Supports English and other languages, making it easy for AI to assist in creating minutes for global meetings.
        </p>
        
        <h3>Cloud Storage & Sharing Features</h3>
        <p>
          The generated meeting minutes are stored in the cloud and can be quickly shared with team members. Version control is also managed effortlessly.
        </p>

        <h2 style={h2Style}>Pricing Plans</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Plan</th>
              <th style={thStyle}>Price</th>
              <th style={thStyle}>Recording Time</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Trial</td>
              <td style={tdStyle}>$1.99</td>
              <td style={tdStyle}>120 minutes</td>
            </tr>
            <tr>
              <td style={tdStyle}>Light</td>
              <td style={tdStyle}>$11.99</td>
              <td style={tdStyle}>1200 minutes</td>
            </tr>
            <tr>
              <td style={tdStyle}>Monthly Subscription</td>
              <td style={tdStyle}>$17.99</td>
              <td style={tdStyle}>Unlimited</td>
            </tr>
            <tr>
              <td style={tdStyle}>Yearly Subscription</td>
              <td style={tdStyle}>$149.99</td>
              <td style={tdStyle}>Unlimited</td>
            </tr>
          </tbody>
        </table>
        <p style={paragraphStyle}>
          Note: Guest users can record up to 3 minutes per day.
        </p>

        <h2 style={h2Style}>Track Record</h2>
        <p style={paragraphStyle}>
          Within just 6 months of the iOS version release, Minutes AI achieved 15,000 downloads worldwide and has been adopted in over 160 countries.
        </p>
        
        {/* App Store Button */}
        <a
          href="https://apps.apple.com/jp/app/%E8%AD%B0%E4%BA%8B%E9%8C%B2ai/id6504087901"
          style={appStoreButtonStyle}
        >
          <FaApple size={20} />
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>App Store</span>
        </a>

        {/* Footer Links */}
        <div style={footerLinksContainerStyle}>
          <a href="/privacy-policy" style={footerLinkStyle}>Privacy Policy</a>
          <a href="/terms-of-use" style={footerLinkStyle}>Terms of Use</a>
          <a href="/transactions-law" style={footerLinkStyle}>Legal Notice</a>
        </div>
      </div>
    </div>
  );
};

export default SEOPage;
