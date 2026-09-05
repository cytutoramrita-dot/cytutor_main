<?php
// If the cookie does NOT exist, create it with isAdmin=0
if (!isset($_COOKIE['isAdmin'])) {
    setcookie("isAdmin", "0", time() + 3600, "/"); // valid for 1 hour
}
?>

<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Power Cookie Challenge</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>You are currently a guest.</p>

  <form action="/check.php" method="GET">
    <button type="submit">Continue</button>
  </form>
</body>
</html>
