import Image from 'next/image';
import { getDiscography } from '@/lib/spreadsheet';

export default async function Home() {
  const discographyData = await getDiscography();
  const years = Object.keys(discographyData).sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <main>
      <header className="container">
        <h1>Discography</h1>
      </header>

      <div className="container">
        {years.map((year) => (
          <section key={year} style={{ marginBottom: '3rem' }}>
            <h2>{year}</h2>
            <div className="grid">
              {discographyData[year].map((item, index) => (
                <div key={index} className="card">
                  {item.imageUrl && (
                    <div style={{ marginBottom: '1rem' }}>
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        width={300}
                        height={300}
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                  )}
                  <h3>{item.title}</h3>
                  <p>{item.type} {item.description && `(${item.description})`}</p>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: '0.9rem' }}>
                    Listen / Buy
                  </a>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
