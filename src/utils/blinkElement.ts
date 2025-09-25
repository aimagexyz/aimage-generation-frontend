export function blinkElement(element?: HTMLElement | null, duration = 2100) {
  if (!element || !duration) {
    return;
  }
  element.classList.add('animate-blink');
  setTimeout(() => {
    element.classList.remove('animate-blink');
  }, duration);
}
