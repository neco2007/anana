import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        {/* 【重要】この一行がないと、ボタンを押してもPythonに繋がりません */}
        <script type="text/javascript" src="/eel.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}