const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../apps/groovelab/src/components/StudentAvatarDashboard.tsx');
let content = fs.readFileSync(studentFile, 'utf8');

content = content.replace(
  "setIsAppUser(user.is_app_user ?? false);",
  "setIsAppUser(true); // Premium/App restrictions removed"
);
content = content.replace(
  "setIsPremiumUser(user.is_premium_user ?? false);",
  "setIsPremiumUser(true); // Premium/App restrictions removed"
);

fs.writeFileSync(studentFile, content);

