console.log('Fetching latest release of WyvernCW/Shngm from GitHub...');

fetch('https://api.github.com/repos/WyvernCW/Shngm/releases/latest')
    .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    })
    .then(data => {
        console.log('Latest Release Info:');
        console.log('Tag Name:', data.tag_name);
        console.log('Name:', data.name);
        console.log('Published At:', data.published_at);
        console.log('HTML URL:', data.html_url);
        console.log('Changelog (body):');
        console.log(data.body);
    })
    .catch(err => {
        console.error('Error fetching releases:', err);
    });
