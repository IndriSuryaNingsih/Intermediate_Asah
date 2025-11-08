export function createTransition() {
  const mainContent = document.querySelector('#main-content');
  if (!mainContent) return;

  // Add fade-out
  mainContent.style.opacity = '0';
  mainContent.style.transform = 'translateY(20px)';
  mainContent.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

  // After a short delay, fade-in
  setTimeout(() => {
    mainContent.style.opacity = '1';
    mainContent.style.transform = 'translateY(0)';
  }, 50);
}

