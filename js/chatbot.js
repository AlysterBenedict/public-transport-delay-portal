// Chatbot Widget Logic connecting to Local google/gemma-3-4b on 192.168.30.201:1234

const BASE_URL = "http://192.168.30.201:1234/v1/chat/completions";

// Toggle is now handled inline in index.html for reliability

function handleChatKeypress(e) {
  if (e.key === "Enter") {
    handleSendClick();
  }
}

function handleSendClick() {
  const inputEl = document.getElementById("chat-input");
  const text = inputEl.value.trim();
  if(!text) return;
  
  inputEl.value = "";
  sendChatMessage(text);
}

// Global exposure for suggestion chips

window.handleChatKeypress = handleChatKeypress;
window.handleSendClick = handleSendClick;
window.sendChatMessage = sendChatMessage;

async function sendChatMessage(userMessage) {
  const chatBody = document.getElementById("chat-body");
  
  // 1. Render User Message
  const userMsgHTML = `
    <div class="chat-msg user" style="display:flex; width:100%; justify-content:flex-end;">
      <div class="chat-bubble" style="background:linear-gradient(135deg, var(--blue), var(--cyan)); color:white; border-bottom-right-radius:2px; max-width:85%; padding:10px 14px; border-radius:12px; font-size:13px; margin-bottom:12px;">
        ${escapeHTML(userMessage)}
      </div>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", userMsgHTML);
  scrollToBottom(chatBody);

  // 2. Render Typing Indicator
  const typingId = "typing-" + Date.now();
  const typingHTML = `
    <div id="${typingId}" class="chat-msg bot" style="display:flex; width:100%; justify-content:flex-start; margin-bottom:12px;">
      <div class="chat-bubble" style="background:rgba(255, 255, 255, 0.05); border:1px solid var(--border); border-bottom-left-radius:2px; padding:10px 14px; border-radius:12px;">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", typingHTML);
  scrollToBottom(chatBody);

  // 3. Make the API Call to Local Server (google/gemma-3-4b)
  let botReply = "I'm sorry, I couldn't connect to my AI brain at the moment.";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemma-3-4b",
        messages: [
          {
            role: "system", 
            content: "You are the DelayTrack virtual assistant, a friendly AI embedded in a public transit delay reporting app. Keep answers concise, helpful, and directly related to transit issues."
          },
          {
            role: "user", 
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: -1,
        stream: false
      })
    });
    clearTimeout(timeoutId);

    if (response.ok) {
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            botReply = data.choices[0].message.content;
        }
    } else {
        console.error("Local LLM Server returned status:", response.status);
        botReply = `Error: Server responded with status ${response.status}. Please check your connection to the 192.168.30.201 server.`;
    }
  } catch (err) {
    console.error("Failed to connect to Local LLM at 192.168.30.201:1234", err);
  }

  // 4. Remove Typing Indicator and Render Response
  const typingEl = document.getElementById(typingId);
  if (typingEl) typingEl.remove();

  const botMsgHTML = `
    <div class="chat-msg bot" style="display:flex; width:100%; justify-content:flex-start; margin-bottom:12px;">
      <div class="chat-bubble" style="background:rgba(255, 255, 255, 0.05); border:1px solid var(--border); border-bottom-left-radius:2px; max-width:85%; padding:10px 14px; border-radius:12px; font-size:13px;">
        ${escapeHTML(botReply).replace(/\n/g, '<br>')}
      </div>
    </div>
  `;
  chatBody.insertAdjacentHTML("beforeend", botMsgHTML);
  scrollToBottom(chatBody);
}

function scrollToBottom(element) {
  setTimeout(() => {
    element.scrollTop = element.scrollHeight;
  }, 50);
}

// Utility to prevent basic injection
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
