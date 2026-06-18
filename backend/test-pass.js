const bcrypt = require('bcrypt');
async function check() {
  const hash = '$2b$10$R0Nw1u5or4CYNYmSs5OkOObHVVj4K7QHX1FfGHqMBjO1yRxt0SqRG';
  const passwords = ['admin', 'admin123', 'Admin123', 'Admin123!', 'password', '1234', 'Admin@123', 'admin@123'];
  for (const p of passwords) {
    const match = await bcrypt.compare(p, hash);
    if (match) console.log('MATCH:', p);
  }
  console.log('Done testing');
}
check().catch(e => console.error(e));
