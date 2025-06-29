fetch("https://outfit-animator.vercel.app/weather?city=London")
  .then(res => res.json())
  .then(data => console.log(data));