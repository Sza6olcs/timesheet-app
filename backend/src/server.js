require("dotenv").config();
const app = require("./app");

if (!process.env.JWT_SECRET) {
  console.error("Hiányzik a JWT_SECRET környezeti változó! Hozz létre egy .env fájlt a .env.example alapján.");
  process.exit(1);
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Timesheet API fut: http://localhost:${port}`);
});
