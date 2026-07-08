// ============================================================================
// GPU Trades - WhatsApp Group Invitation Widget
// ============================================================================

function showWhatsAppInvite() {
  const modal = document.createElement('div');
  modal.id = 'whatsapp-invite-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: 'Arial', sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 30px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease;
  `;

  card.innerHTML = `
    <div style="margin-bottom: 20px;">
      <svg style="width: 60px; height: 60px; margin: 0 auto;" viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.6915026,13.4744748 C17.4744531,13.3599899 16.1845879,12.6815314 15.9315722,12.5873326 C15.6694621,12.4997595 15.4673722,12.4392857 15.2820396,12.6563168 C15.0974731,12.8733478 14.6268989,13.4167556 14.4575582,13.6274667 C14.2882175,13.8381778 14.1136772,13.8626819 13.8951509,13.7449899 C13.6719757,13.6244648 12.9612006,13.3899899 12.1155071,12.6274667 C11.4575168,12.041206 11.0831117,11.3213133 10.9149623,11.1016618 C10.7504297,10.8892808 10.8691624,10.7257379 10.9956127,10.6095769 C11.1055451,10.5081725 11.2379502,10.3496863 11.3553913,10.1790093 C11.4727627,10.0082714 11.5301652,9.87925906 11.6294017,9.66960903 C11.7242676,9.45907607 11.671556,9.28871313 11.5887041,9.17035646 C11.5058521,9.05128009 11.1309961,8.15268029 10.9068886,7.65027471 C10.6916842,7.17220618 10.4722957,7.24362302 10.3081917,7.23676882 C10.1517797,7.23033501 9.99540666,7.22846277 9.83961818,7.22846277 C9.68498515,7.22846277 9.41816024,7.28896514 9.15553488,7.50972766 C8.89290952,7.73049018 8.19688731,8.40880204 8.19688731,9.30686468 C8.19688731,10.2049273 9.17266,11.0729328 9.28540034,11.2874019 C9.39814068,11.501871 11.3553913,15.0151496 14.4205826,16.3300221 C15.0287514,16.6017816 15.5024769,16.7704131 15.8739618,16.8835614 C16.4841162,17.0699076 17.0434583,17.038963 17.4692719,16.9479249 C17.9488718,16.8446122 18.9389979,16.327535 19.1628885,15.7484868 C19.3867791,15.1694386 19.3867791,14.6743251 19.3016649,14.5545309 C19.2175213,14.4341733 19.0590479,14.3738048 18.8349319,14.2609968 Z M12.0057638,19.9999999 C6.47563557,19.9999999 2,15.5265444 2,10.0072228 C2,4.48790112 6.47563557,0 12.0057638,0 C17.5348653,0 22,4.48790112 22,10.0072228 C22,15.5265444 17.5348653,19.9999999 12.0057638,19.9999999 Z"/>
      </svg>
    </div>
    <h2 style="color: #333; margin: 0 0 10px 0; font-size: 20px;">انضم لمجموعة الواتس</h2>
    <p style="color: #25D366; margin: 0 0 5px 0; font-weight: bold;">Join Our WhatsApp Group</p>
    <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">
      تابع كل جديد | Follow all updates
    </p>
    <a href="https://chat.whatsapp.com/IEtEtFmrXpm6TcVgPG2Cry?mode=ems_copy_t" 
       target="_blank"
       style="
         display: inline-block;
         background: #25D366;
         color: white;
         padding: 12px 30px;
         border-radius: 25px;
         text-decoration: none;
         font-weight: bold;
         margin: 10px 5px;
         transition: all 0.3s;
       "
       onmouseover="this.style.background='#20BA5A'"
       onmouseout="this.style.background='#25D366'">
      انضم الآن ➜
    </a>
    <button onclick="document.getElementById('whatsapp-invite-modal').remove()" 
            style="
              display: inline-block;
              background: #eee;
              color: #333;
              padding: 12px 30px;
              border: none;
              border-radius: 25px;
              cursor: pointer;
              font-weight: bold;
              margin: 10px 5px;
              transition: all 0.3s;
            "
            onmouseover="this.style.background='#ddd'"
            onmouseout="this.style.background='#eee'">
      تخطي ✕
    </button>
  `;

  modal.appendChild(card);
  document.body.appendChild(modal);

  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Show modal after 3 seconds on store open
document.addEventListener('DOMContentLoaded', () => {
  const visited = sessionStorage.getItem('whatsapp_invite_shown');
  if (!visited) {
    setTimeout(showWhatsAppInvite, 3000);
    sessionStorage.setItem('whatsapp_invite_shown', 'true');
  }
});
