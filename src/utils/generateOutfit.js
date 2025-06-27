fetch("http://localhost:5000/weather?city=London")
  .then(res => res.json())
  .then(data => console.log(data));