const message = document.getElementById('message');
const preview = document.getElementById('message-preview');
const count = document.getElementById('char-count');
const channelLabel = document.getElementById('channel-label');
const toast = document.getElementById('toast');
let selectedChannel = 'SMS';
function updatePreview(){
  preview.textContent = message.value || 'Your message preview will appear here.';
  count.textContent = `${message.value.length} characters`;
}
message.addEventListener('input', updatePreview);
document.querySelectorAll('.channel').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.channel').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedChannel = btn.dataset.channel;
  channelLabel.textContent = `${selectedChannel} message`;
  showToast(`${selectedChannel} preview selected — no message was sent.`);
}));
document.getElementById('preview-btn').addEventListener('click', () => {
  updatePreview();
  showToast('Preview updated — no message was sent.');
});
function showToast(text){
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
document.querySelector('.menu-toggle').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('open'));
document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.main-nav').classList.remove('open')));
updatePreview();
