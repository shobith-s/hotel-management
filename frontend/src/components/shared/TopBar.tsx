interface TopBarProps {
  title?: string
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="bg-surface/80 backdrop-blur-xl sticky top-0 w-full z-40 shadow-header h-20 flex justify-between items-center px-10">
      {title && (
        <h2 className="font-headline text-xl italic font-bold text-primary">{title}</h2>
      )}
      <div className="flex items-center gap-6 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-surface-container-low transition-all">
            <span className="material-symbols-outlined text-primary">notifications</span>
          </button>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </div>
        {/* Settings */}
        <button className="p-2 rounded-full hover:bg-surface-container-low transition-all">
          <span className="material-symbols-outlined text-primary">settings</span>
        </button>
        {/* Avatar */}
        <div className="h-10 w-10 rounded-full overflow-hidden bg-primary-fixed-dim flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[20px]">person</span>
        </div>
      </div>
    </header>
  )
}
