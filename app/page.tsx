export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#061c33',
        color: '#ffffff',
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section style={{ textAlign: 'center', maxWidth: '36rem' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem' }}>ECCOMI NOLEGGIO</h1>
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem' }}>Applicazione online</h2>
        <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
          GitHub, Render and the application are working correctly.
        </p>
      </section>
    </main>
  );
}
