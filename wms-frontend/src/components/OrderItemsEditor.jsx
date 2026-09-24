import { useEffect, useState } from 'react'
import axios from 'axios'

export default function OrderItemsEditor({ items, onChange }) {
  const [products,setProducts]=useState([])
  const [error,setError]=useState('')
  useEffect(() => {
    let active=true
    axios.get('/api/products').then(response => { if (active) setProducts(response.data) })
      .catch(() => { if (active) setError('商品列表读取失败，请稍后重试。') })
    return () => { active=false }
  },[])
  const update=(index,field,value) => onChange(items.map((item,i) => i===index ? {...item,[field]:value} : item))
  return <div className="space-y-3">
    <div className="flex justify-between text-sm text-white"><span>商品明细</span>
      <button type="button" className="text-[#bcf540]" onClick={() => onChange([...items,{productId:'',quantity:1}])}>+ 添加商品</button>
    </div>
    {error && <p className="text-red-400">{error}</p>}
    {items.map((item,index) => <div key={index} className="flex gap-2">
      <select required value={item.productId} onChange={e => update(index,'productId',Number(e.target.value))}
        className="flex-1 bg-[#242826] text-white p-3 rounded" aria-label="商品">
        <option value="">选择商品</option>
        {products.map(p => <option key={p.id} value={p.id}>{p.skuCode} · {p.name}（库存 {p.stock}）</option>)}
      </select>
      <input required type="number" min="1" step="1" value={item.quantity} onChange={e => update(index,'quantity',Number(e.target.value))}
        className="w-24 bg-[#242826] text-white p-3 rounded" aria-label="数量" />
      <button type="button" className="text-red-400 px-2" onClick={() => onChange(items.filter((_,i)=>i!==index))}>删除</button>
    </div>)}
  </div>
}