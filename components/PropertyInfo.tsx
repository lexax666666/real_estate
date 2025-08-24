'use client';

interface PropertyInfoProps {
  data: any;
  onNewSearch: () => void;
  onPreviousSearch: () => void;
  hasPrevious: boolean;
}

export default function PropertyInfo({ data, onNewSearch, onPreviousSearch, hasPrevious }: PropertyInfoProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US');
  };

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md mt-8">
      <div className="border-b border-gray-200 p-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={onNewSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            New Search
          </button>
          {hasPrevious && (
            <button
              onClick={onPreviousSearch}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Previous Search
            </button>
          )}
        </div>

        <div className="flex justify-between items-start">
          <div>
            <button className="text-yellow-600 hover:underline mb-2">View Map</button>
            <div className="text-red-500 font-medium">Special Tax Recapture: None</div>
          </div>
          <div className="text-right">
            <div className="font-medium">No Ground Rent Redemption on File</div>
            <div className="font-medium mt-2">No Ground Rent Registration on File</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <div className="text-gray-600 mb-1">Account Number:</div>
            <div className="text-gray-600 mb-4">Owner Name:</div>
            <div className="font-medium text-lg">{data.ownerName || 'N/A'}</div>
            
            <div className="text-gray-600 mt-4 mb-1">Mailing Address:</div>
            <div>{data.address || 'N/A'}</div>
            <div>{data.city || ''} {data.state || ''} {data.zipCode || ''}</div>
            
            <div className="text-gray-600 mt-4 mb-1">Premises Address:</div>
            <div>{data.address || 'N/A'}</div>
            <div>{data.city || ''} {data.state || ''} {data.zipCode || ''}</div>
          </div>

          <div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-center mb-4">Owner Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Use:</div>
                  <div>{data.propertyType || 'RESIDENTIAL'}</div>
                  
                  <div className="text-gray-600 mt-2">Principal Residence:</div>
                  <div>YES</div>
                </div>
                <div>
                  <div className="text-gray-600">Deed Reference:</div>
                  <div>{data.lastSaleDate ? formatDate(data.lastSaleDate) : 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded mt-4">
              <h3 className="font-semibold text-center mb-4">Location & Structure Information</h3>
              <div className="text-sm">
                <div className="text-gray-600">Legal Description:</div>
                <div className="mb-2">{data.lotSize ? `LOT SIZE: ${data.lotSize} sq ft` : 'N/A'}</div>
                <div>{data.address || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 text-sm border-t border-b py-4">
          <div>
            <div className="text-gray-600">Map:</div>
            <div>0036</div>
            <div className="text-gray-600 mt-2">Town:</div>
            <div>None</div>
          </div>
          <div>
            <div className="text-gray-600">Grid:</div>
            <div>0022</div>
          </div>
          <div>
            <div className="text-gray-600">Parcel:</div>
            <div>0420</div>
          </div>
          <div>
            <div className="text-gray-600">Neighborhood:</div>
            <div>{data.neighborhood || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-600">Subdivision:</div>
            <div>{data.subdivision || 'N/A'}</div>
            <div className="text-gray-600 mt-2">Section:</div>
            <div>-</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mt-6 mb-6">
          <div>
            <div className="text-gray-600 text-sm">Primary Structure Built</div>
            <div className="font-semibold">{data.yearBuilt || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Above Grade Living Area</div>
            <div className="font-semibold">{data.squareFootage ? `${data.squareFootage} SF` : 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Finished Basement Area</div>
            <div className="font-semibold">{data.basementSize || '652 SF'}</div>
          </div>
          <div>
            <div className="text-gray-600 text-sm">Property Land Area</div>
            <div className="font-semibold">{data.lotSize ? `${data.lotSize} SF` : 'N/A'}</div>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-4 text-sm border-t pt-4">
          <div>
            <div className="text-gray-600">Stories</div>
            <div>{data.stories || '2'}</div>
          </div>
          <div>
            <div className="text-gray-600">Basement</div>
            <div>{data.basement ? 'YES' : 'NO'}</div>
          </div>
          <div>
            <div className="text-gray-600">Type</div>
            <div>{data.propertyType || 'STANDARD UNIT'}</div>
          </div>
          <div>
            <div className="text-gray-600">Exterior</div>
            <div>FRAME</div>
          </div>
          <div>
            <div className="text-gray-600">Quality</div>
            <div>4</div>
          </div>
          <div>
            <div className="text-gray-600">Full/Half Bath</div>
            <div>{data.bathrooms ? `${Math.floor(data.bathrooms)} full/${data.bathrooms % 1 > 0 ? '1' : '0'} half` : '2 full/1 half'}</div>
          </div>
          <div>
            <div className="text-gray-600">Garage</div>
            <div>{data.garage || '1 Attached'}</div>
          </div>
          <div>
            <div className="text-gray-600">Last Notice of Major Improvements</div>
            <div>-</div>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 p-4 rounded">
          <h3 className="font-semibold text-center mb-4">Value Information</h3>
          <div className="grid grid-cols-3 gap-8">
            <div>
              <h4 className="text-gray-600 mb-2">Base Value</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Land:</span>
                  <span>{formatCurrency(data.assessedValue?.land || 176500)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Improvements:</span>
                  <span>{formatCurrency(data.assessedValue?.building || 205700)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(data.assessedValue?.total || 382200)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Preferential Land:</span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-gray-600 mb-2">Value</h4>
              <div className="text-sm text-gray-600 mb-1">As of {formatDate(data.assessedDate || '01/01/2024')}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span></span>
                  <span>{formatCurrency(196500)}</span>
                </div>
                <div className="flex justify-between">
                  <span></span>
                  <span>{formatCurrency(270500)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span></span>
                  <span>{formatCurrency(467000)}</span>
                </div>
                <div className="flex justify-between">
                  <span></span>
                  <span>0</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-gray-600 mb-2">Phase-in Assessments</h4>
              <div className="text-sm text-gray-600 mb-1">As of 07/01/2025</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-semibold">
                  <span></span>
                  <span>{formatCurrency(438733)}</span>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2 mb-1">As of 07/01/2026</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-semibold">
                  <span></span>
                  <span>{formatCurrency(467000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-50 p-4 rounded">
          <h3 className="font-semibold text-center mb-4">Transfer Information</h3>
          <div className="grid grid-cols-3 gap-8 text-sm">
            <div>
              <div className="text-gray-600">Seller:</div>
              <div>{data.lastSalePrice ? 'PREVIOUS OWNER' : 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-600">Date:</div>
              <div>{data.lastSaleDate ? formatDate(data.lastSaleDate) : 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-600">Price:</div>
              <div>{data.lastSalePrice ? formatCurrency(data.lastSalePrice) : 'N/A'}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-8 text-sm mt-4">
            <div>
              <div className="text-gray-600">Type:</div>
              <div>ARMS LENGTH IMPROVED</div>
            </div>
            <div>
              <div className="text-gray-600">Deed1:</div>
              <div>{data.lastSaleDate ? formatDate(data.lastSaleDate) : 'N/A'}</div>
            </div>
            <div>
              <div className="text-gray-600">Deed2:</div>
              <div>-</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}