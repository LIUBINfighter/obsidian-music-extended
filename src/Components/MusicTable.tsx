import React, { useState, useEffect, useMemo } from 'react';
import { TFile } from 'obsidian';
import { MusicMetadata } from '../metadata-utils';
import { formatDuration, formatBitrate } from '../metadata-utils';
import { findMusicFiles } from '../utils';

// 定义表格列接口
interface TableColumn {
    id: string;
    label: string;
    accessor: (metadata: MusicMetadata, file?: TFile) => string | number | React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
}

// 定义过滤条件接口
interface FilterOption {
    id: string;
    label: string;
    options: string[];
    selected: string[];
}

// 定义组件属性接口
interface MusicTableProps {
    app: any;
    onFileOpen: (file: TFile) => Promise<void>;
}

const MusicTable: React.FC<MusicTableProps> = ({ app, onFileOpen }) => {
    const [musicFiles, setMusicFiles] = useState<TFile[]>([]);
    const [musicMetadata, setMusicMetadata] = useState<MusicMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ 
        key: 'title', 
        direction: 'ascending' 
    });
    const [filters, setFilters] = useState<FilterOption[]>([]);
    const [showFilters, setShowFilters] = useState<boolean>(false);

    // 定义表格列
    const columns: TableColumn[] = [
        { 
            id: 'title', 
            label: '标题', 
            accessor: (metadata) => metadata.title || '', 
            sortable: true,
            filterable: false
        },
        { 
            id: 'artist', 
            label: '艺术家', 
            accessor: (metadata) => metadata.artist || '未知艺术家', 
            sortable: true,
            filterable: true
        },
        { 
            id: 'album', 
            label: '专辑', 
            accessor: (metadata) => metadata.album || '未知专辑', 
            sortable: true,
            filterable: true
        },
        { 
            id: 'duration', 
            label: '时长', 
            accessor: (metadata) => metadata.duration ? formatDuration(metadata.duration) : '未知',
            sortable: true,
            filterable: false
        },
        { 
            id: 'fileSize', 
            label: '文件大小', 
            accessor: (metadata) => metadata.fileSize ? `${metadata.fileSize} MB` : '未知',
            sortable: true,
            filterable: false
        },
        { 
            id: 'bitrate', 
            label: '比特率', 
            accessor: (metadata) => metadata.bitrate ? formatBitrate(metadata.bitrate) : '未知',
            sortable: true,
            filterable: false
        },
        { 
            id: 'sampleRate', 
            label: '采样率', 
            accessor: (metadata) => metadata.sampleRate ? `${Math.round(metadata.sampleRate / 1000)} kHz` : '未知',
            sortable: true,
            filterable: false
        },
        { 
            id: 'extension', 
            label: '格式', 
            accessor: (metadata, file) => file ? file.extension.toUpperCase() : '未知',
            sortable: true,
            filterable: true
        }
    ];

    // 加载音乐文件
    const loadMusicFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 获取音乐文件
            const files = await findMusicFiles(app.vault);
            setMusicFiles(files);
            
            // 解析音乐文件元数据
            const metadataPromises = files.map(async (file) => {
                try {
                    const { parseMusicMetadata } = await import('../metadata-utils');
                    return await parseMusicMetadata(file);
                } catch (error) {
                    console.error(`解析文件 ${file.path} 元数据失败:`, error);
                    return {
                        title: file.basename,
                        filePath: file.path
                    };
                }
            });
            
            const metadata = await Promise.all(metadataPromises);
            setMusicMetadata(metadata);
            
            // 初始化过滤选项
            initializeFilters(metadata, files);
            
        } catch (err) {
            console.error('加载音乐文件失败:', err);
            setError('加载音乐文件时出错');
        } finally {
            setLoading(false);
        }
    };

    // 初始化过滤选项
    const initializeFilters = (metadata: MusicMetadata[], files: TFile[]) => {
        const newFilters: FilterOption[] = [];
        
        // 添加艺术家过滤
        const artistOptions = Array.from(new Set(
            metadata
                .map(m => m.artist || '未知艺术家')
                .filter(Boolean)
        )).sort();
        
        newFilters.push({
            id: 'artist',
            label: '艺术家',
            options: artistOptions,
            selected: []
        });
        
        // 添加专辑过滤
        const albumOptions = Array.from(new Set(
            metadata
                .map(m => m.album || '未知专辑')
                .filter(Boolean)
        )).sort();
        
        newFilters.push({
            id: 'album',
            label: '专辑',
            options: albumOptions,
            selected: []
        });
        
        // 添加格式过滤
        const formatOptions = Array.from(new Set(
            files.map(f => f.extension.toUpperCase())
        )).sort();
        
        newFilters.push({
            id: 'extension',
            label: '格式',
            options: formatOptions,
            selected: []
        });
        
        setFilters(newFilters);
    };

    // 首次加载
    useEffect(() => {
        loadMusicFiles();
    }, []);

    // 排序逻辑
    const sortedData = useMemo(() => {
        if (!musicMetadata.length) return [];
        
        const sortableData = [...musicMetadata];
        const { key, direction } = sortConfig;
        
        return sortableData.sort((a, b) => {
            const column = columns.find(col => col.id === key);
            if (!column) return 0;
            
            const fileA = musicFiles.find(f => f.path === a.filePath);
            const fileB = musicFiles.find(f => f.path === b.filePath);
            
            let valueA = column.accessor(a, fileA);
            let valueB = column.accessor(b, fileB);
            
            // 将React节点转换为字符串
            if (React.isValidElement(valueA)) valueA = '';
            if (React.isValidElement(valueB)) valueB = '';
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return direction === 'ascending' ? valueA - valueB : valueB - valueA;
            }
            
            // 转换为字符串进行比较
            const strA = String(valueA).toLowerCase();
            const strB = String(valueB).toLowerCase();
            
            if (strA < strB) return direction === 'ascending' ? -1 : 1;
            if (strA > strB) return direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [musicMetadata, musicFiles, sortConfig]);

    // 过滤和搜索逻辑
    const filteredData = useMemo(() => {
        return sortedData.filter(metadata => {
            const file = musicFiles.find(f => f.path === metadata.filePath);
            if (!file) return false;
            
            // 应用搜索过滤
            if (searchTerm) {
                const searchText = [
                    metadata.title,
                    metadata.artist,
                    metadata.album,
                    file.basename
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchText.includes(searchTerm.toLowerCase())) {
                    return false;
                }
            }
            
            // 应用列过滤
            for (const filter of filters) {
                if (filter.selected.length === 0) continue;
                
                const column = columns.find(col => col.id === filter.id);
                if (!column) continue;
                
                const value = column.accessor(metadata, file);
                const stringValue = String(value).toLowerCase();
                
                const matchesFilter = filter.selected.some(option => 
                    stringValue === option.toLowerCase()
                );
                
                if (!matchesFilter) return false;
            }
            
            return true;
        });
    }, [sortedData, musicFiles, searchTerm, filters]);

    // 处理排序点击
    const handleSort = (columnId: string) => {
        setSortConfig(currentSortConfig => {
            if (currentSortConfig.key === columnId) {
                // 如果已经在按这列排序，切换方向
                return {
                    key: columnId,
                    direction: currentSortConfig.direction === 'ascending' ? 'descending' : 'ascending'
                };
            }
            
            // 否则，使用这列作为新的排序键，默认升序
            return { key: columnId, direction: 'ascending' };
        });
    };

    // 处理过滤器变化
    const handleFilterChange = (filterId: string, optionValue: string, checked: boolean) => {
        setFilters(currentFilters => 
            currentFilters.map(filter => {
                if (filter.id !== filterId) return filter;
                
                return {
                    ...filter,
                    selected: checked
                        ? [...filter.selected, optionValue]
                        : filter.selected.filter(value => value !== optionValue)
                };
            })
        );
    };

    // 清除所有过滤器
    const clearAllFilters = () => {
        setFilters(currentFilters => 
            currentFilters.map(filter => ({
                ...filter,
                selected: []
            }))
        );
        setSearchTerm('');
    };

    // 切换过滤器面板
    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    // 处理行点击，打开文件
    const handleRowClick = (metadata: MusicMetadata) => {
        const file = musicFiles.find(f => f.path === metadata.filePath);
        if (file) {
            onFileOpen(file);
        }
    };

    return (
        <div className="music-table-container">
            <div className="music-table-header">
                <h2>音乐列表</h2>
            </div>
            
            <div className="music-table-toolbar">
                <div className="music-table-search">
                    <input
                        type="text"
                        className="music-search-input"
                        placeholder="搜索音乐文件..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="music-table-actions">
                    <button 
                        className={`music-table-filter-toggle ${showFilters ? 'active' : ''}`} 
                        onClick={toggleFilters}
                    >
                        筛选
                    </button>
                    <button 
                        className="music-table-filter-clear" 
                        onClick={clearAllFilters}
                        disabled={filters.every(f => f.selected.length === 0) && !searchTerm}
                    >
                        清除筛选
                    </button>
                </div>
            </div>
            
            {showFilters && (
                <div className="music-table-filters">
                    {filters.map(filter => (
                        <div key={filter.id} className="music-filter-group">
                            <h3>{filter.label}</h3>
                            <div className="music-filter-options">
                                {filter.options.map(option => (
                                    <label key={option} className="music-filter-option">
                                        <input 
                                            type="checkbox"
                                            checked={filter.selected.includes(option)}
                                            onChange={(e) => handleFilterChange(
                                                filter.id, 
                                                option, 
                                                e.target.checked
                                            )}
                                        />
                                        <span>{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="music-table-stats">
                显示 {filteredData.length} 个音频文件，共 {musicMetadata.length} 个
            </div>
            
            {loading ? (
                <div className="music-table-loading">正在加载音乐文件...</div>
            ) : error ? (
                <div className="music-table-error">{error}</div>
            ) : (
                <div className="music-table-wrapper">
                    <table className="music-data-table">
                        <thead>
                            <tr>
                                {columns.map(column => (
                                    <th 
                                        key={column.id} 
                                        className={column.sortable ? 'sortable' : ''}
                                        onClick={() => column.sortable && handleSort(column.id)}
                                    >
                                        <div className="table-header-content">
                                            <span>{column.label}</span>
                                            {column.sortable && sortConfig.key === column.id && (
                                                <span className="sort-indicator">
                                                    {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="no-results">
                                        没有找到匹配的音乐文件
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((metadata, index) => {
                                    const file = musicFiles.find(f => f.path === metadata.filePath);
                                    if (!file) return null;
                                    
                                    return (
                                        <tr 
                                            key={metadata.filePath} 
                                            onClick={() => handleRowClick(metadata)}
                                            className="music-table-row"
                                        >
                                            {columns.map(column => (
                                                <td key={`${metadata.filePath}-${column.id}`}>
                                                    {column.accessor(metadata, file)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MusicTable;
