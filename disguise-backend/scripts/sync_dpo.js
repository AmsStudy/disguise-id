const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const FormData = require('form-data');

const prisma = new PrismaClient();

async function main() {
  console.log("Starting DPO Embeddings Synchronization...");

  const persons = await prisma.watchlistPerson.findMany({
    where: { photoUrl: { not: null }, deletedAt: null },
    include: { photos: true },
  });

  console.log(`Found ${persons.length} active DPOs with photos.`);

  for (const person of persons) {
    try {
      console.log(`Processing DPO: ${person.fullName} (${person.id})`);
      
      // 1. Download the image from the MinIO photoUrl
      const imageUrl = person.photoUrl;
      console.log(`  -> Downloading image from: ${imageUrl}`);
      
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      // 2. Post to ml-service /embed (which now uses MTCNN)
      const form = new FormData();
      form.append('image', imageBuffer, { filename: 'photo.jpg' });

      console.log(`  -> Sending to ml-service for MTCNN extraction...`);
      const mlResponse = await axios.post('http://localhost:8000/embed', form, {
        headers: {
          ...form.getHeaders(),
          'X-Api-Key': 'acqz2QumaF073H43o4-GMi6h4RUwF4qSen5i7jASgokihLcQnY09ZqG0UaXTARzi',
        },
      });

      const embedding = mlResponse.data.embedding;

      if (!embedding || embedding.length !== 512) {
        console.error(`  -> Failed to get valid 512-dim embedding for ${person.fullName}`);
        continue;
      }

      // 3. Update database via raw SQL
      console.log(`  -> Updating database with new embedding...`);
      await prisma.$executeRawUnsafe(
        `UPDATE watchlist_persons SET embedding = $1::vector WHERE id = $2`,
        `[${embedding.join(',')}]`,
        person.id
      );

      // Also update the primary photo if it exists
      for (const photo of person.photos) {
        if (photo.isPrimary) {
           await prisma.$executeRawUnsafe(
             `UPDATE watchlist_photos SET embedding = $1::vector WHERE id = $2`,
             `[${embedding.join(',')}]`,
             photo.id
           );
        }
      }

      console.log(`  -> Successfully updated ${person.fullName}!`);
    } catch (err) {
      console.error(`  -> ERROR processing ${person.fullName}:`, err.message);
      if (err.response) {
        console.error(`     Response: ${JSON.stringify(err.response.data)}`);
      }
    }
  }

  console.log("Synchronization complete.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
