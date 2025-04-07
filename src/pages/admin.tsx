import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
// @ts-ignore
import { supabase } from '../lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [selectedIndustry, setSelectedIndustry] = useState('介護')
  const [templateMap, setTemplateMap] = useState<Record<string, string[]>>({
    '介護': ['記録を作成してください'],
    '営業': ['営業報告を作成してください'],
    '教育': ['OJT記録を作成してください']
  })

  const updateTemplate = (index: number, newValue: string) => {
    const updated = [...templateMap[selectedIndustry]]
    updated[index] = newValue
    setTemplateMap({ ...templateMap, [selectedIndustry]: updated })
  }

  const addTemplate = () => {
    const updated = [...templateMap[selectedIndustry], '']
    setTemplateMap({ ...templateMap, [selectedIndustry]: updated })
  }

  const deleteTemplate = (index: number) => {
    const updated = [...templateMap[selectedIndustry]]
    updated.splice(index, 1)
    setTemplateMap({ ...templateMap, [selectedIndustry]: updated })
  }

  const saveTemplates = () => {
    localStorage.setItem('admin-templates', JSON.stringify(templateMap))
    alert('保存しました！')
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
  
      if (error || !user) {
        router.push('/login')
        return
      }
  
      // user_profiles テーブルから role を確認
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
  
      if (profileError || profile?.role !== 'admin') {
        alert('アクセス権限がありません')
        router.push('/')
        return
      }
  
      setUser(user)
      setLoading(false)
    }
  
    checkUser()
  }, [router])  

  useEffect(() => {
    const saved = localStorage.getItem('admin-templates')
    if (saved) {
      setTemplateMap(JSON.parse(saved))
    }
  }, [])

  if (loading) return <p>読み込み中...</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">👑 管理画面</h1>
      <p>ようこそ、{user?.email} さん！</p>

      <button
  onClick={async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }}
  className="mt-6 bg-red-500 text-white px-4 py-2 rounded"
>
  ログアウト
</button>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">📋 テンプレート編集</h2>

        <label className="block mb-2 font-semibold">業種を選択：</label>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="border px-3 py-2 rounded mb-4"
        >
          {Object.keys(templateMap).map((industry) => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </select>

        <ul className="mb-4">
          {templateMap[selectedIndustry].map((template, index) => (
            <li key={index} className="mb-1 flex items-center">
              <input
                type="text"
                value={template}
                onChange={(e) => updateTemplate(index, e.target.value)}
                className="border px-2 py-1 w-full"
              />
              <button
                onClick={() => deleteTemplate(index)}
                className="ml-2 text-red-500"
              >削除</button>
            </li>
          ))}
        </ul>

        <button
          onClick={addTemplate}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          ＋ テンプレート追加
        </button>

        <button
          onClick={saveTemplates}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          💾 保存
        </button>
      </div>
    </div>
  )
}