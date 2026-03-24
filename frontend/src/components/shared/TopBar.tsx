interface TopBarProps {
  title?: string
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="bg-surface/80 backdrop-blur-xl sticky top-0 w-full z-40 shadow-header h-20 flex justify-between items-center px-10">
      {title && (
        <h2 className="font-headline text-xl italic font-bold text-primary">{title}</h2>
      )}
    </header>
  )
}
