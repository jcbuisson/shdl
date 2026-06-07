export default {
   schema: './src/db/schema.js',
   out: './drizzle',
   dialect: 'postgresql',
   dbCredentials: {
      url: process.env.DATABASE_URL,
   },
}
