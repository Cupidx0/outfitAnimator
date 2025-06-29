fetch("https://outfit-animator-aclevjfe2-cupidx0s-projects.vercel.app/weather?city=London")
  .then(res => res.json())
  .then(data => console.log(data));