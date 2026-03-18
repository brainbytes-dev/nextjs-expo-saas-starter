export default function SelfServiceNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-xs w-full bg-white rounded-2xl border shadow-sm p-8 text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold text-gray-900">
          Artikel nicht gefunden
        </h1>
        <p className="text-sm text-gray-500">
          Der gescannte QR-Code gehört zu keinem bekannten Werkzeug oder Material.
          Bitte wende dich an dein Team.
        </p>
        <p className="text-xs text-gray-400 pt-2">LogistikApp</p>
      </div>
    </div>
  )
}
