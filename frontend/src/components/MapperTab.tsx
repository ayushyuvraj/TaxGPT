import { SectionMapperPanel } from './SectionMapperPanel'

export function MapperTab({ initialQuery }: { initialQuery?: string }) {
  return (
    <div className="h-full">
      <SectionMapperPanel initialQuery={initialQuery} />
    </div>
  )
}
