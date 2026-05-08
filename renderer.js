document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');
        
        // Hide welcome screen if it's visible
        const welcome = document.getElementById('welcome-screen');
        if (welcome) welcome.style.display = 'none';
        
        // Tell main process to switch service
        const service = btn.getAttribute('data-service');
        window.electronAPI.switchService(service);
    });
});
