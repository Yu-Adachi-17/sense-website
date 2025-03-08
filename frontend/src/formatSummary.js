// // formatSummary.js
// export function formatSummary(text) {
//     // 中見出しの前後に改行タグとspanタグでラップ
//     let formatted = text.replace(
//       /(■(?:Point|Lecture|Original Forecast))/g,
//       '<br/><br/><span class="subheading">$1</span>'
//     );
    
//     // 箇条書き（例：先頭に・がある行）の後にも改行タグを挿入
//     formatted = formatted.replace(/(・.+)(\n|$)/g, '$1<br/>');
    
//     return formatted;
//   }
  