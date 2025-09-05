document.addEventListener('DOMContentLoaded', function() {
  const button = document.getElementById('clickMe');
  
  button.addEventListener('click', showContent);
});

function showContent(){
    const now = new Date();
    alert(`Hello from my Chrome extension! ${now}`);
}