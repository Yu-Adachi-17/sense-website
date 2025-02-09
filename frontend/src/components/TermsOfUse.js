import React from 'react';

const TermsOfUse = () => {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: 'auto',
        padding: '20px',
        lineHeight: 1.8,
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'black',
        color: 'white',
        fontSize: '18px', // 本文用のフォントサイズ
        fontWeight: 'bold', // 全体を太字に
      }}
    >
      <h1
        style={{
          fontSize: '40px', // 元の32pxより大きく
          textAlign: 'left', // 中央揃えから左揃えへ変更
          marginBottom: '20px',
          fontWeight: 'bold',
        }}
      >
        Terms of Use
      </h1>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        1. Introduction
      </h2>
      <p>
        These terms define the conditions for using the Meeting Minutes AI
        (hereinafter referred to as "the Service"). By using the Service, users
        agree to these terms.
      </p>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        2. Usage Conditions
      </h2>
      <ul>
        <li>The Service can be used by both individuals and corporations.</li>
        <li>Users must use the Service in a lawful and appropriate manner.</li>
      </ul>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        3. Prohibited Actions
      </h2>
      <ul>
        <li>Illegally collecting or using other users’ personal information</li>
        <li>Unauthorized access to the Service’s system</li>
        <li>Interfering with the operation of the Service</li>
        <li>Actions that violate laws or public order and morals</li>
      </ul>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        4. Account Management
      </h2>
      <ul>
        <li>Users may delete their accounts at any time.</li>
        <li>Users are responsible for managing their account information.</li>
      </ul>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        5. Disclaimer
      </h2>
      <ul>
        <li>
          As the Service uses AI for automatic generation, it does not guarantee
          the accuracy or completeness of the output.
        </li>
        <li>
          The Service provider is not responsible for any damages resulting from
          the use of the Service.
        </li>
        <li>
          The Service may be temporarily unavailable due to technical issues.
        </li>
      </ul>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        6. Service Modification and Termination
      </h2>
      <p>
        The Service provider may change, suspend, or terminate the Service
        without prior notice to users.
      </p>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        7. Governing Law and Jurisdiction
      </h2>
      <p>
        These terms are governed by the laws of the Service provider’s location.
        Any disputes will be under the exclusive jurisdiction of the courts at
        the provider’s location.
      </p>

      <h2 style={{ fontSize: '32px', marginTop: '30px', fontWeight: 'bold' }}>
        8. Contact Information
      </h2>
      <p>
        For inquiries regarding these terms, please contact us at the following
        email address:
      </p>
      <p>
        <strong>[Contact Information]</strong>
      </p>
    </div>
  );
};

export default TermsOfUse;
