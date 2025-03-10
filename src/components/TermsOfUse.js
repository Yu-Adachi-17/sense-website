import React from 'react';
import HomeIcon from '../components/HomeIcon';

const TermsOfUse = () => {
  const containerStyle = {
    maxWidth: '800px',
    margin: '0px auto',
    padding: '30px',
    backgroundColor: '#000',
    color: '#fff',
    fontSize: '18px', // 基本のフォントサイズをやや大きめに設定
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

  const headingStyle = {
    fontWeight: 'bold',
  };

  const h1Style = {
    fontSize: '40px', // 元の32pxより大きく
    marginBottom: '20px',
    ...headingStyle,
  };

  const h2Style = {
    fontSize: '28px', // 元の24pxより大きく
    marginTop: '30px',
    marginBottom: '10px',
    ...headingStyle,
  };

  const paragraphStyle = {
    marginBottom: '10px',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* 画面左上に HomeIcon を配置し、サイズを 30 に設定 */}
      <div style={homeIconStyle}>
        <HomeIcon size={30} />
      </div>

      <div style={containerStyle}>
        <h1 style={h1Style}>Terms of Use</h1>

        <h2 style={h2Style}>1. Introduction</h2>
        <p style={paragraphStyle}>
          These terms define the conditions for using the Meeting Minutes AI (hereinafter referred to as "the Service"). By using the Service, users agree to these terms.
        </p>

        <h2 style={h2Style}>2. Usage Conditions</h2>
        <ul>
          <li style={paragraphStyle}>The Service can be used by both individuals and corporations.</li>
          <li style={paragraphStyle}>Users must use the Service in a lawful and appropriate manner.</li>
        </ul>

        <h2 style={h2Style}>3. Prohibited Actions</h2>
        <ul>
          <li style={paragraphStyle}>Illegally collecting or using other users’ personal information</li>
          <li style={paragraphStyle}>Unauthorized access to the Service’s system</li>
          <li style={paragraphStyle}>Interfering with the operation of the Service</li>
          <li style={paragraphStyle}>Actions that violate laws or public order and morals</li>
        </ul>

        <h2 style={h2Style}>4. Account Management</h2>
        <ul>
          <li style={paragraphStyle}>Users may delete their accounts at any time.</li>
          <li style={paragraphStyle}>Users are responsible for managing their account information.</li>
        </ul>

        <h2 style={h2Style}>5. Disclaimer</h2>
        <ul>
          <li style={paragraphStyle}>
            As the Service uses AI for automatic generation, it does not guarantee the accuracy or completeness of the output.
          </li>
          <li style={paragraphStyle}>
            The Service provider is not responsible for any damages resulting from the use of the Service.
          </li>
          <li style={paragraphStyle}>
            The Service may be temporarily unavailable due to technical issues.
          </li>
        </ul>

        <h2 style={h2Style}>6. Service Modification and Termination</h2>
        <p style={paragraphStyle}>
          The Service provider may change, suspend, or terminate the Service without prior notice to users.
        </p>

        <h2 style={h2Style}>7. Governing Law and Jurisdiction</h2>
        <p style={paragraphStyle}>
          These terms are governed by the laws of the Service provider’s location. Any disputes will be under the exclusive jurisdiction of the courts at the provider’s location.
        </p>

        <h2 style={h2Style}>8. Contact Information</h2>
        <p style={paragraphStyle}>
          For inquiries regarding these terms, please contact us at the following email address:
        </p>
        <p style={{ ...paragraphStyle, fontWeight: 'bold' }}>[info@sense-ai.world]</p>
      </div>
    </div>
  );
};

export default TermsOfUse;
