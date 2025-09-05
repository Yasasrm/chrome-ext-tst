document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('clickMe');
  
  button.addEventListener('click', function() {
    alert('Hello from my Chrome extension!');
  });
});