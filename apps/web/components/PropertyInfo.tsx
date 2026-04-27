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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date + 'T00:00:00');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const formatDeedRef = (liber: string | null, folio: string | null) => {
    if (!liber || !folio) return '';
    return `/${liber}/ ${folio.padStart(5, '0')}`;
  };

  const parseAccountNumber = (assessorId: string | null) => {
    if (!assessorId || assessorId.length < 4) return { district: '', identifier: assessorId || '' };
    const district = assessorId.substring(2, 4);
    const identifier = assessorId.substring(4);
    return { district, identifier };
  };

  const account = parseAccountNumber(data.assessorID);

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md mt-8 mb-8">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={onNewSearch}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors text-sm font-medium"
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
        <div className="text-center text-sm text-gray-500 mb-2">
          Search Result for <span className="font-semibold">{data.county || ''} COUNTY</span>
        </div>
        <div className="flex justify-center gap-12 text-sm">
          <span className="text-yellow-700 hover:underline cursor-pointer">Search Land Records</span>
          <span className="text-gray-500">Ground Rent Redemption Info Unavailable</span>
          <span className="text-gray-500">Ground Rent Registration Info Unavailable</span>
        </div>
      </div>

      <div className="p-6">
        {/* Special Tax Recapture */}
        <div className="text-red-500 text-sm mb-2">Special Tax Recapture: None</div>

        {/* Account Number */}
        <div className="flex gap-2 text-sm mb-4">
          <span className="text-yellow-700">Account Number:</span>
          <span>
            <span className="font-semibold">District</span> - {account.district}{' '}
            <span className="font-semibold">Account Identifier</span> - {account.identifier}
          </span>
        </div>

        {/* Owner Information heading */}
        <h3 className="font-semibold text-center mb-4">Owner Information</h3>

        {/* Owner Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-6">
          <div className="md:col-span-1">
            <div className="text-yellow-700 mb-1">Owner Name:</div>
            <div className="mb-4">
              {data.ownerName?.split(',').map((name: string, i: number) => (
                <div key={i} className="font-medium">{name.trim()}</div>
              )) || 'N/A'}
            </div>

            <div className="text-yellow-700 mb-1">Mailing Address:</div>
            <div className="mb-4">
              <div>{data.ownerAddress1 || data.address || ''}</div>
              <div>
                {data.ownerCity || data.city || ''} {data.ownerState || data.state || ''} {data.ownerZip || data.zipCode || ''}{data.ownerZip2 ? `-${data.ownerZip2}` : ''}
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="text-yellow-700 mb-1">Use:</div>
            <div className="mb-2">{data.propertyType || 'N/A'}</div>

            <div className="text-yellow-700 mb-1">Principal Residence:</div>
            <div className="mb-2">{data.ownerOccupied ? 'YES' : 'NO'}</div>
          </div>

          <div className="md:col-span-1">
            <div className="text-yellow-700 mb-1">Deed Reference:</div>
            <div>{formatDeedRef(data.deedLiber, data.deedFolio) || 'N/A'}</div>
          </div>
        </div>

        {/* Location & Structure Information heading */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Location & Structure Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <div className="text-yellow-700 mb-1">Premises Address:</div>
            <div>{data.address || 'N/A'}</div>
            <div>{data.city || ''} {data.zipCode || ''}{data.ownerZip2 ? `-${data.ownerZip2}` : ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 mb-1">Legal Description:</div>
            <div className="whitespace-pre-line">{data.legalDescription || 'N/A'}</div>
          </div>
        </div>

        {/* Map/Grid/Parcel row */}
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 text-sm border-t border-b py-3 mb-1">
          <div>
            <div className="text-yellow-700 text-xs">Map:</div>
            <div>{data.map || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Grid:</div>
            <div>{data.grid || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Parcel:</div>
            <div>{data.parcel || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Neighborhood:</div>
            <div>{data.neighborhood || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Subdivision:</div>
            <div>{data.subdivision || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Section:</div>
            <div>{data.section || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Block:</div>
            <div>{data.block || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Lot:</div>
            <div>{data.lot || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Assessment Year:</div>
            <div>{data.assessedDate || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Plat No:</div>
            <div></div>
          </div>
        </div>

        {/* Town */}
        <div className="text-sm mb-6">
          <span className="text-yellow-700">Town:</span> {data.town || 'None'}
        </div>

        {/* Building Details Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm border-t pt-4 mb-4">
          <div>
            <div className="text-yellow-700 text-xs">Primary Structure Built</div>
            <div className="font-semibold">{data.yearBuilt || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Above Grade Living Area</div>
            <div className="font-semibold">{data.squareFootage ? `${formatNumber(data.squareFootage)} SF` : ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Finished Basement Area</div>
            <div className="font-semibold"></div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Property Land Area</div>
            <div className="font-semibold">{data.lotSize ? `${formatNumber(data.lotSize)} SF` : ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">County Use</div>
            <div className="font-semibold"></div>
          </div>
        </div>

        {/* Building Details Row 2 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm border-t pt-3 mb-6">
          <div>
            <div className="text-yellow-700 text-xs">Stories</div>
            <div>{data.stories || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Basement</div>
            <div>{data.basement || 'NO'}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Type</div>
            <div>{data.propertyType || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Exterior</div>
            <div>{data.exterior?.replace(/^CNST\s*/i, '') || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Quality</div>
            <div>{data.quality || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Full/Half Bath</div>
            <div>{data.bathrooms ? `${Math.floor(data.bathrooms)} full/ ${data.bathrooms % 1 > 0 ? '1' : '0'} half` : ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Garage</div>
            <div>{data.garage || ''}</div>
          </div>
          <div>
            <div className="text-yellow-700 text-xs">Last Notice of Major Improvements</div>
            <div></div>
          </div>
        </div>

        {/* Value Information */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Value Information</h3>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left w-1/6"></th>
                <th className="text-yellow-700 font-normal text-center">Base Value</th>
                <th className="text-yellow-700 font-normal text-center">
                  Value<br />
                  <span className="text-xs">As of<br />01/01/{data.assessedDate || new Date().getFullYear()}</span>
                </th>
                <th className="text-yellow-700 font-normal text-center" colSpan={2}>
                  Phase-in Assessments<br />
                  <span className="text-xs">
                    As of<br />07/01/{data.assessedDate || new Date().getFullYear()}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-yellow-700 py-1">Land:</td>
                <td className="text-center"></td>
                <td className="text-center">{data.assessedValue?.land ? formatNumber(data.assessedValue.land) : ''}</td>
                <td className="text-center"></td>
                <td className="text-center"></td>
              </tr>
              <tr>
                <td className="text-yellow-700 py-1">Improvements</td>
                <td className="text-center"></td>
                <td className="text-center">{data.assessedValue?.building ? formatNumber(data.assessedValue.building) : ''}</td>
                <td className="text-center"></td>
                <td className="text-center"></td>
              </tr>
              <tr>
                <td className="text-yellow-700 py-1">Total:</td>
                <td className="text-center"></td>
                <td className="text-center">{data.assessedValue?.total ? formatNumber(data.assessedValue.total) : ''}</td>
                <td className="text-center"></td>
                <td className="text-center"></td>
              </tr>
              <tr>
                <td className="text-yellow-700 py-1">Preferential Land:</td>
                <td className="text-center">0</td>
                <td className="text-center">0</td>
                <td className="text-center"></td>
                <td className="text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Transfer Information */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Transfer Information</h3>
        <div className="space-y-4 mb-6 text-sm">
          {data.history && data.history.length > 0 ? (
            data.history.map((sale: any, idx: number) => (
              <div key={idx} className="border-b pb-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-yellow-700">Seller: </span>
                    <span>{sale.seller || ''}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700">Date: </span>
                    <span>{sale.date ? formatDate(sale.date) : ''}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700">Price: </span>
                    <span>{sale.price ? formatCurrency(sale.price) : ''}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <div>
                    <span className="text-yellow-700">Type: </span>
                    <span>{sale.documentType || 'ARMS LENGTH IMPROVED'}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700">Deed1: </span>
                    <span>{idx === 0 ? formatDeedRef(data.deedLiber, data.deedFolio) : formatDeedRef(data.grantorLiber, data.grantorFolio)}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700">Deed2:</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="border-b pb-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-yellow-700">Seller: </span>
                </div>
                <div>
                  <span className="text-yellow-700">Date: </span>
                  <span>{data.lastSaleDate ? formatDate(data.lastSaleDate) : ''}</span>
                </div>
                <div>
                  <span className="text-yellow-700">Price: </span>
                  <span>{data.lastSalePrice ? formatCurrency(data.lastSalePrice) : ''}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-1">
                <div><span className="text-yellow-700">Type: </span></div>
                <div>
                  <span className="text-yellow-700">Deed1: </span>
                  <span>{formatDeedRef(data.deedLiber, data.deedFolio)}</span>
                </div>
                <div><span className="text-yellow-700">Deed2:</span></div>
              </div>
            </div>
          )}
          {/* Empty transfer row */}
          <div className="border-b pb-3">
            <div className="grid grid-cols-3 gap-4">
              <div><span className="text-yellow-700">Seller:</span></div>
              <div><span className="text-yellow-700">Date:</span></div>
              <div><span className="text-yellow-700">Price:</span></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-1">
              <div><span className="text-yellow-700">Type:</span></div>
              <div><span className="text-yellow-700">Deed1:</span></div>
              <div><span className="text-yellow-700">Deed2:</span></div>
            </div>
          </div>
        </div>

        {/* Exemption Information */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Exemption Information</h3>
        <div className="text-sm mb-2">
          <div className="grid grid-cols-4 gap-4 mb-1">
            <div className="text-yellow-700">Partial Exempt Assessments:</div>
            <div className="text-yellow-700">Class</div>
            <div className="text-yellow-700">07/01/{data.assessedDate || new Date().getFullYear()}</div>
            <div className="text-yellow-700">07/01/{(data.assessedDate || new Date().getFullYear()) + 1}</div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-yellow-700">County:</div>
            <div>000</div>
            <div>0.00</div>
            <div></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-yellow-700">State:</div>
            <div>000</div>
            <div>0.00</div>
            <div></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-yellow-700">Municipal:</div>
            <div>000</div>
            <div>0.00|0.00</div>
            <div>0.00|0.00</div>
          </div>
        </div>
        <div className="text-red-500 text-sm mb-6">Special Tax Recapture: None</div>

        {/* Homestead Application Information */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Homestead Application Information</h3>
        <div className="text-sm mb-6">
          <span className="text-yellow-700">Homestead Application Status: </span>
          <span>
            {data.homesteadStatus
              ? `Approved   ${data.homesteadDate ? formatDate(data.homesteadDate) : ''}`
              : 'No Application'}
          </span>
        </div>

        {/* Homeowners' Tax Credit */}
        <h3 className="font-semibold text-center border-t pt-4 mb-4">Homeowners&apos; Tax Credit Application Information</h3>
        <div className="text-sm mb-4">
          <span className="text-yellow-700">Homeowners&apos; Tax Credit Application Status: </span>
          <span>No Application</span>
          <span className="ml-8 text-yellow-700">Date:</span>
        </div>
      </div>
    </div>
  );
}
