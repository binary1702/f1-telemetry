import GuideShell from '@/components/setups/guide/GuideShell'
import Glossary, { ColourLegend } from '@/components/setups/guide/Glossary'

export default function GlossaryPage() {
  return (
    <GuideShell title="GLOSSARY" active="glossary">
      <ColourLegend />
      <Glossary />
    </GuideShell>
  )
}
