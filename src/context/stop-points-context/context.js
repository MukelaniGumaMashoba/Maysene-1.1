// icons
import { Plus, Map, MapPin } from 'lucide-react'

// components
import {
  createActionsColumn,
  createCheckboxColumn,
  createSortableHeader,
} from '@/components/ui/data-table'

// hooks
import { getStopPointBadgeType } from '@/hooks/use-badges'

const titleSection = {
  title: 'Stop Points',
  description: 'Manage locations for pick-up, delivery, and stops',
  button: {
    text: 'Add Stop Point',
    icon: <Plus className="mr-2 h-4 w-4" />,
  },
}

const getScreenStats = (data = []) => [
  {
    title: 'Total Stop Points',
    value: data.length,
    icon: <Map className="h-4 w-4 text-gray-500" />,
  },
  {
    title: 'Warehouses',
    value: data.filter(sp => sp.type === 'warehouse').length,
    icon: <MapPin className="h-4 w-4 text-blue-500" />,
  },
  {
    title: 'Distribution Centers',
    value: data.filter(sp => sp.type === 'distribution').length,
    icon: <MapPin className="h-4 w-4 text-green-500" />,
  },
  {
    title: 'Hubs',
    value: data.filter(sp => sp.type === 'hub').length,
    icon: <MapPin className="h-4 w-4 text-purple-500" />,
  },
]

const screenStats = getScreenStats([])

const tableInfo = {
  title: 'Stop Points',
  filterColumn: 'name',
  filterPlaceholder: 'Search stop points...',
}

const columns = ({ onEdit, onDelete }) => {
  return [
    createCheckboxColumn(),
    {
      accessorKey: 'id',
      header: createSortableHeader('ID'),
      // cell: ({ row }) => (
      //   <div className="font-medium">{row.getValue('id')}</div>
      // ),
    },
    {
      accessorKey: 'name',
      header: createSortableHeader('Name'),
    },
    {
      accessorKey: 'address',
      header: createSortableHeader('Address'),
      // cell: ({ row }) => (
      //   <div className="max-w-[200px] truncate" title={row.getValue('address')}>
      //     {row.getValue('address')}
      //   </div>
      // ),
    },
    {
      accessorKey: 'type',
      header: createSortableHeader('Type'),
      cell: ({ row }) => getStopPointBadgeType(row.getValue('type')),
    },
    // {
    //   accessorKey: 'coordinates',
    //   header: createSortableHeader('Coordinates'),
    // },
    {
      accessorKey: 'contactPerson',
      header: createSortableHeader('Contact'),
      // cell: ({ row }) => (
      //   <div>
      //     <div className="font-medium">{row.getValue('contactPerson')}</div>
      //     <div className="text-sm text-gray-500">
      //       {row.original.contactPhone}
      //     </div>
      //   </div>
      // ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const stopPoint = row.original

        return createActionsColumn({ data: stopPoint, onEdit, onDelete })
      },
    },
  ]
}

// data
const data = []

const headers = [
  'ID',
  'Name',
  'Address',
  'Type',
  'Contact Person',
  'Contact Phone',
]

const rows = (data) => {
  return data.map((item) => [
    item.id || '',
    item.name || '',
    item.address || '',
    item.type || '',
    item.contactPerson || '',
    item.contactPhone || '',
  ])
}

export const initialStopPointsState = {
  csv_headers: headers,
  csv_rows: rows,
  titleSection,
  screenStats,
  getScreenStats,
  tableInfo,
  columns: columns,
  data,
  loading: false,
  error: null,
}
