import { MarketSegment } from './types';

export const MARKET_SEGMENTS: MarketSegment[] = [
  {
    id: 'residential',
    name: 'Residential/Housing',
    subSegments: [
      'Apartments and Condos',
      'Assisted Living Facilities',
      'Housing Authority'
    ]
  },
  {
    id: 'education',
    name: 'Education and Non-Profit',
    subSegments: [
      'Churches and Temples',
      'College and Universities',
      'Education K-12',
      'Goodwill',
      'Head Start',
      'Job Corps'
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare and Medical',
    subSegments: [
      'Dialysis Centers',
      'Hospitals',
      'Medical Offices and Clinics',
      'Veteran Affairs Hospitals'
    ]
  },
  {
    id: 'government',
    name: 'Government and Public Services',
    subSegments: [
      'Coast Guard',
      'Corrections and Prisons',
      'First Responders',
      'Municipalities',
      'National Park Services',
      'Native American Reservations',
      'Office Buildings',
      'State and Local Parks',
      'U.S. Army Corps of Engineering',
      'U.S. Forest Service',
      'U.S. Department of Agriculture'
    ]
  },
  {
    id: 'commercial',
    name: 'Commercial and Hospitality',
    subSegments: [
      'Fitness Centers',
      'Funeral Homes',
      'Grocery Stores',
      'Hotels and Lodging Facilities',
      'Indoor Recreation Centers'
    ]
  },
  {
    id: 'industrial',
    name: 'Industrial and Manufacturing',
    subSegments: [
      'Equipment Rental Facilities',
      'Food Processing Plants',
      'Greenhouses/Cannabis',
      'Manufacturing'
    ]
  },
  {
    id: 'specialized',
    name: 'Specialized',
    subSegments: [
      'Animal Services'
    ]
  }
];
