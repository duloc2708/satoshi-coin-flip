import ExplorerLink from "./ExplorerLink";

/* 
    This component needs the following prop
    linksArray: [{id: `string`, type: `string`}]
    Each element is an object with `id` and `type` fields
    `id` is the address, object id or transaction id we want to search on the explorer
    `type` is one of `address` `object` `transaction`
*/
export default function LinksContainer({ linksArray }) {
    return (
        <div className="w-[17rem] bg-white rounded-md text-sui-sky">
            {linksArray.map((item)=> 
                <ExplorerLink key={item.id} type={item.type} id={item.id} />
            )}
        </div>
    )
}