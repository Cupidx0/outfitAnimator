fetch(`${import.meta.env.VITE_BACKEND_URL}/weather?city=London`)
  .then(res => res.json())
  .then(data => console.log(data));