import { TemplateGrid } from "@/modules/catalog/components/template-grid";
import { api } from "@/shared/lib/api";
import { mockCopy, mockSections } from "@/shared/lib/mock-data";
import { Badge, Card, PageHeader, Tabs, Table, Tbody, Td, Th, Thead, Tr } from "@/shared/ui";

export default async function AdminContentPage() {
  const templates = await api.templates.list();

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Konten"
        description="Kelola template, section, dan copy library."
      />
      <Tabs
        items={[
          {
            id: "templates",
            label: "Template",
            content: <TemplateGrid templates={templates} hrefBase="/templates" />,
          },
          {
            id: "sections",
            label: "Section",
            content: (
              <Card title="Section library">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Kode</Th>
                      <Th>Nama</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {mockSections.map((section) => (
                      <Tr key={section.code}>
                        <Td>{section.code}</Td>
                        <Td>{section.name}</Td>
                        <Td><Badge variant="success">READY</Badge></Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            ),
          },
          {
            id: "copy",
            label: "Copy",
            content: (
              <Card title="Copy library">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Key</Th>
                      <Th>Label</Th>
                      <Th>Contoh</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {mockCopy.map((field) => (
                      <Tr key={field.key}>
                        <Td>{field.key}</Td>
                        <Td>{field.label}</Td>
                        <Td>{field.value}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
