import { useRouter } from 'next/router';

const HomeIcon = ({ size = '40px' }) => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push('/')} // ✅ 修正: navigate → router.push
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        cursor: 'pointer',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(153, 184, 255)" />
            <stop offset="20%" stopColor="rgba(115, 115, 255, 1)" />
            <stop offset="40%" stopColor="rgba(102, 38, 153, 1)" />
            <stop offset="60%" stopColor="rgb(95, 13, 133)" />
            <stop offset="80%" stopColor="rgba(255, 38, 38, 1)" />
            <stop offset="100%" stopColor="rgb(199, 42, 76)" />
          </linearGradient>
        </defs>
        <path
          fill="url(#circleGradient)"
          d="M256 8C119.03 8 8 119.03 8 256s111.03 248 248 248 248-111.03 248-248S392.97 8 256 8zm0 448c-110.28 0-200-89.72-200-200S145.72 56 256 56s200 89.72 200 200-89.72 200-200 200z"
        />
      </svg>
    </div>
  );
};

export default HomeIcon;
